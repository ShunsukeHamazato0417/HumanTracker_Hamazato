'use strict'

const kafka        = require('kafka-node');
const fs           = require('fs');


const config_json = JSON.parse(fs.readFileSync('/home/endo/web/WSserver/ws_config.json', 'utf8'));

const kafka_hosts           = config_json[0].kafkaHost;
const raw_data_topics       = config_json[0].raw_data_topics;
const remove_bg_data_topics = config_json[0].remove_bg_data_topics;

const sensor_n    = config_json[1].num_of_sensors;
const sensor_info = Array(sensor_n + 1);
const max_num_of_points = config_json[1].max_num_of_points;
const fps         = config_json[1].fps;

const i_remove_bg_data_consumerOptions = {
	  kafkaHost: kafka_hosts,
	  groupId : 'remove_bg_data',
	  autoCommit : false,
	  protocol : ['roundrobin'],
          fromOffset : 'latest',
	  encoding : 'utf8', 
          commitOffsetsOnFirstJoin : true,
          outOfRangeOffset: 'latest'
};
const i_remove_bg_data_consumer_group = new ConsumerGroup(Object.assign({ id : 'test-integrated_remove_bg_data'}, i_remove_bg_data_consumerOptions), 
					                "integrated_remove_bg_data");
i_remove_bg_data_consumer_group.on('message', onMessage_kafka);
i_remove_bg_data_consumer_group.on('error', onError_kafka);
i_remove_bg_data_consumer_group.on('connect', function(){
  console.log('1_remove_bg_data: connected!');
});


function onMessage_kafka (message) {
  var now = new Date();
  var json = JSON.parse(message.value);

  console.log(json);
}

