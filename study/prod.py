from kafka import KafkaProducer
import json

server = '192.168.50.42:9092, 192.168.50.43:9092, 192.168.50.44:9092, 192.168.50.45:9092'
producer = KafkaProducer(bootstrap_servers=server)
for _ in range(100):
   producer.send('foobar', b'some_message_bytes')
