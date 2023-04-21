from kafka import KafkaConsumer
import json
import datetime

server = '192.168.50.42:9092, 192.168.50.43:9092, 192.168.50.44:9092, 192.168.50.45:9092'
consumer1 = KafkaConsumer('bytra', bootstrap_servers=server)
consumer2 = KafkaConsumer('remove_bg_data_1', bootstrap_servers=server)
# consumer = KafkaConsumer('remove_bg_data_1', bootstrap_servers=server)
for msg in consumer1:
    data1 = msg.value.decode('utf-8')
    jdata1 = json.loads(data1)
    dt_now = datetime.datetime.now()
    # print(jdata["det_time"])
    print(jdata1)
    # print(dt_now)
for msg in consumer2:
    data2 = msg.value.decode('utf-8')
    jdata2 = json.loads(data2)
    # print(jdata["det_time"])
    print(jdata2)
    # print(dt_now)