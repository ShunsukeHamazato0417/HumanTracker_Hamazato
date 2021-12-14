/* ----- 生データ・背景除去データ表示用オブジェクト ----- */
class SensorObject {
  /* ----- パラメータ ----- */
  constructor(x, y, d, data, sensor_id){
    this.sensor_id = sensor_id;
    this.x         = x;
    this.y         = y;
    this.d         = d;
    this.data      = data;
  }
};
