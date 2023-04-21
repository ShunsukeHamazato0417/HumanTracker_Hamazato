'use strict';
var kafka = require("kafka-node");

const Producer = kafka.HighLevelProducer;
const client = new kafka.KafkaClient({
    kafkaHost: "localhost:9092"
});
const producer = new Producer(client, {
    partitionerType: 1
});

producer.on("ready", () => {
    //プログラム引数で名前と年齢を受け取る
    const name = process.argv[2];
    const age = process.argv[3];
    const message = [
        {
            topic: "test",
            messages: JSON.stringify({name: name, age: age})
        }
    ];

    producer.send(message, (err, data) => {
        if (err) console.log(err);
        else console.log('send messages');
        process.exit();
    });
});