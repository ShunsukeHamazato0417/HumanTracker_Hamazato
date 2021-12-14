#include "Urg_driver.h"
#include "Connection_information.h"
#include "math_utilities.h"

#include <iostream>
#include <yaml-cpp/yaml.h>
#include <string>
#include <cstring>
#include <vector>
#include <sys/time.h>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <chrono>
#include <thread>


using namespace qrk;
using namespace std;
using namespace chrono;

struct Sensor{
  string name;
  string use;
  string ip;
  int port;
  Urg_driver urg;
 
  double x;
  double y;
  double direction;

  int max_dist;	
  int min_deg;
  int max_deg;
};


void read_config(YAML::Node config, vector<Sensor>& sensors, int sensor_n){
  try{    
    for (int i=1; i<=sensor_n; i++ ){
      sensors[i].name = "sensor-" + to_string(i);
      sensors[i].use = config[sensors[i].name]["use"].as<string>();
      if (sensors[i].use == "ether"){
        sensors[i].ip = config[sensors[i].name]["ip"].as<string>();
        sensors[i].port = config[sensors[i].name]["port"].as<int>();
        sensors[i].min_deg = config[sensors[i].name]["min_deg"].as<int>();
	sensors[i].max_deg = config[sensors[i].name]["max_deg"].as<int>();
	sensors[i].x = config[sensors[i].name]["x"].as<double>();
        sensors[i].y = config[sensors[i].name]["y"].as<double>();
        sensors[i].direction = config[sensors[i].name]["direction"].as<double>();
	sensors[i].max_dist = config[sensors[i].name]["max_dist"].as<int>();
      }
    }
  }catch(YAML::ParserException& e){
    cerr << e.what() << endl;
  }
}


void connect_to_sensor(vector<Sensor>& sensors, int sensor_n){
  for (int i=1; i<=sensor_n; i++){
    if (!sensors[i].urg.open(sensors[i].ip.c_str(), sensors[i].port, Urg_driver::Ethernet)){
      cout << "Urg_driver::open(): " << sensors[i].ip << ": " << sensors[i].urg.what() << endl;
    }
  }
}


void save_xy_data(vector<Sensor>& sensors, vector<vector<long>>& data, int sensor_n, string filepath, bool visualize){
  vector<double> tmp(2);

  time_t t =time(nullptr);
  const tm* localTime = localtime(&t);
  struct timeval tv;
  int ret = gettimeofday(&tv, nullptr);
  int sec = tv.tv_sec % 60;
  int usec = floor(tv.tv_usec/1000);


  if (visualize){
    ofstream ofs(filepath);

    if (!ofs){
      cout << "file could not open." << endl;
    }

    ofs << "[{\"time\": \"";
    ofs << localTime->tm_year + 1900 << "/";
    ofs << setw(2) << setfill('0') << localTime->tm_mon + 1 << "/";
    ofs << setw(2) << setfill('0') << localTime->tm_mday << " ";
    ofs << setw(2) << setfill('0') << localTime->tm_hour << ":";
    ofs << setw(2) << setfill('0') << localTime->tm_min << ":";
    ofs << setw(2) << setfill('0') << sec << ".";
    ofs << setw(3) << setfill('0') << usec << "\"}";

    for (int i=1; i<=sensor_n; i++){
      ofs << ",\n{\"id\": " << i << ", ";
      ofs << "\"min_deg\": " << sensors[i].min_deg << ", ";
      ofs << "\"max_deg\": " << sensors[i].max_deg << ", ";
      ofs << "\"max_dist\": " << sensors[i].max_dist << ", "; 
      ofs << "\"x\": " << sensors[i].x << ", ";
      ofs << "\"y\": " << sensors[i].y << ", ";
      ofs << "\"direction\": " << sensors[i].direction << ", "; 
      ofs << "\"data\": [";
      for (unsigned int j=0; j<data[i].size(); j++){
        ofs << "[";
        tmp[0] =  data[i][j] * cos(sensors[i].urg.index2rad(j));
        tmp[1] = -data[i][j] * sin(sensors[i].urg.index2rad(j));
        ofs << tmp[0] << ", " << tmp[1] << "]";
        if (j!=data[i].size()-1) { ofs << ", "; }
      }
      ofs << "]}";
    }
    ofs << "]";
    ofs.close();
  }
}


int main(int argc, char *argv[])
{
  bool timer = false;
  bool visualize = false;
  int time_tmp;
  system_clock::time_point start;
  for (int i=1; i<argc; ++i){
    if (!strcmp(argv[1], "-t")){
      timer = true;
      start = system_clock::now();
    }
    if (!strcmp(argv[1], "-v")){
      visualize = true;
    }
  }

  YAML::Node config = YAML::LoadFile("config.yaml");
  int sensor_n = config["num_of_sensors"].as<int>();
  vector<Sensor> sensors(sensor_n+1);
	
  // configファイルを読み込む
  read_config(config, sensors, sensor_n);
  if (timer){
    system_clock::time_point read_config = system_clock::now();
    time_tmp = static_cast<int>(duration_cast<microseconds>(read_config-start).count() / 1000);
    cout << "read_config: " << time_tmp << "ms" << endl;
  }

  // 接続
  connect_to_sensor(sensors, sensor_n);

  // 計測開始
  for (int i=1; i<=sensor_n; i++){
    sensors[i].urg.set_scanning_parameter(sensors[i].urg.deg2step(sensors[i].min_deg),
                                  	  sensors[i].urg.deg2step(sensors[i].max_deg), 0);
    sensors[i].urg.start_measurement(Urg_driver::Distance, Urg_driver::Infinity_times, 0);
  }
  if (timer){
    system_clock::time_point ready_measure = system_clock::now();
    time_tmp = static_cast<int>(duration_cast<microseconds>(ready_measure-start).count() / 1000)-time_tmp;
    cout << "ready_measure: " << time_tmp << "ms" << endl;
  }


  double avg = 0.0;
  string filepath = "/home/endo/web/CTservice/static/visualization/json/raw_data_buffer.json";
  //for (int j=0; j<100; j++){
  while(true){
    if (timer){
      start = system_clock::now();
    }

    vector<vector<long>> data(sensor_n+1);
		
    #pragma omp parallel
    {
      #pragma omp for
      for (int i=1; i<=sensor_n; i++){
        long time_stamp = 0;

        if (!sensors[i].urg.get_distance(data[i], &time_stamp)){
          cout << "Urg_driver::get_distance(): " << sensors[i].urg.what() << endl;
        }
      }
    }

    save_xy_data(sensors, data, sensor_n, filepath, visualize);

    if (timer){
      system_clock::time_point get_data = system_clock::now();
      time_tmp = static_cast<int>(duration_cast<microseconds>(get_data-start).count() / 1000);
      //cout << j << ": " << time_tmp << "ms" << endl;
      avg += time_tmp;
    }

  }

  if (timer){
    cout << "avg: " << avg/100 << "ms" << endl;	
  }

  return 0;
}
