from kafka import KafkaConsumer
import websocket

server = '192.168.50.42:9092, 192.168.50.43:9092, 192.168.50.44:9092, 192.168.50.45:9092'
topic = 'cluster_data'

consumer = KafkaConsumer(bootstrap_servers=server)
consumer.subscribe(topic)
print("Subscribe Topic "+topic+" From "+server)
send_data = ''
for msg in consumer:
    send_data = msg.value.decode('utf-8')


class Websocket_Client():

    def __init__(self, host_addr):
        self.objects = []
        self.time_buffer_size = 100
        self.current_objects = []
        self.losted_objects  = []
        self.frame = 0

        # デバックログの表示/非表示設定
        websocket.enableTrace(False)

        # WebSocketAppクラスを生成
        # 関数登録のために、ラムダ式を使用
        self.ws = websocket.WebSocketApp(host_addr,
            on_message = lambda ws, msg: self.on_message(ws, msg),
            on_error   = lambda ws, msg: self.on_error(ws, msg),
            on_close   = lambda ws: self.on_close(ws))
        self.ws.on_open = lambda ws: self.on_open(ws)


    # メッセージ受信に呼ばれる関数
    def on_message(self, ws, message):
        

    # エラー時に呼ばれる関数
    def on_error(self, ws, error):
        print(error)

    # サーバーから切断時に呼ばれる関数
    def on_close(self, ws):
        print("### closed ###")

    # サーバーから接続時に呼ばれる関数
    def on_open(self, ws):
        thread.start_new_thread(self.run, ())

    # サーバーから接続時にスレッドで起動する関数
    def run(self, *args):
        self.ws.send("send_RemoveBgData")
    
    # websocketクライアント起動
    def run_forever(self):
        self.ws.run_forever()


HOST_ADDR = "ws://localhost:8082"
ws_client = Websocket_Client(HOST_ADDR)
ws_client.run_forever()