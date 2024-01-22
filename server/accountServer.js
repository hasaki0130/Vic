
const express = require("express")
const app = express();
const io = require('socket.io-client');
const http = require('http').Server(app)
const sio = require('socket.io')(http)
const Login = require('../function/login')
const gamectr = require('./game_ctr')

// 允許跨域使用本服務
var cors = require("cors");
const { userInfo } = require("os");
app.use(cors());

// 協助 Express 解析表單與JSON資料
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

// Web 伺服器的靜態檔案置於 public 資料夾
app.use("/public", express.static("../public"));

app.all('*', (req, res, next) => {
  res.header('Access-Control-Origin', "*");
  res.header('Access-Control-Allow-Headers', "X-Requested-With");
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS,DELETE');
  res.header("X-Powered-By", '3.2.1');
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
})

app.get('/', (req, res) => {
  res.send('Hello');
});
//登錄
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // console.log(req,"收到的帳號:", req.body.email, "密碼:", password);

  Login.getUsers(email, password)
    .then(userDetails => {

      res.status(200).json({ message: '登錄成功', userDetails });
    })
    .catch(error => {
      res.status(401).json({ message: '登錄失敗', error });
    });
});

//檢測帳號重複

// 註冊
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  console.log("name:", username, "email:", email, "password:", password);

  Login.registerNewUser(username, email, password)
    .then(NewUserDetails => {
      res.status(200).json({ message: '註冊成功', NewUserDetails });

    })
    .catch(error => {
      res.send.json({ message: '註冊失敗', error });
    });
});

app.get('/confirmname', (req, res) => {
  let username = req.query.username;

  Login.getData(username)
    .then(result => {
      if (result.length > 0) {
        // 如果獲取到資料，表示用戶名已存在
        res.status(200).send({ exists: true, message: "用戶名已被占用" });
      } else {
        // 如果沒有資料，表示用戶名不存在
        res.status(200).send({ exists: false, message: "用戶名可用" });
      }
    }).catch(error => {
      // 處理可能出現的錯誤
      res.status(500).send({ error: error.message });
    });
});
//獲取伺服器信息
app.get('/get_serverinfo', (req, res) => {
  const data = { version: '0.0.1' };
  res.send(data);
});

app.post('/getPost', (req, res) => {
  console.log(req.body)
});
// 一切就緒，開始接受用戶端連線

http.listen(3000);
sio.on('connection', (socket) => {
  let clientIp = socket.handshake.address;
  socket.emit('connected', '' + clientIp);
  console.log('a user connected,ip = ' + clientIp);
  socket.on("game_ping", () => {
    socket.emit("game_pong")
  })
  socket.on('notify', (req) => {
    
    
    const cmdType = req.cmd;
    const info = req.data;
    const callIndex = req.callindex;

    var that = {}
    that._username = info.username;    //用户昵称
    that._email = info.email;  //用户账号
    that._avatar = info.avatar;  //头像
    that._money = info.money;       //当前金币
    that._socket = socket
    that._gamesctr = gamectr
    that._room = undefined //所在房间的引用
    that._seatindex = 0   //在房间的位置
    that._isready = false //当前在房间的状态 是否点击了准备按钮
    that._cards = []      //当前手上的牌
    
    // console.log(`收到通知: 命令類型 - ${cmdType}, 數據 - ${JSON.stringify(info.username)},callIndex - ${callIndex}`);
    switch (cmdType) {
      case 'login':
        gamectr.create_player(info, socket, callIndex)
        break;
      case "createroom_req":
        // 假设 gameCtr 有一个 createRoom 方法
        gamectr.create_room(info,that,function(err,result){
          if(err!=0){
              console.log("create_room err:"+ err)
          }else{
              that._room = result.room
              console.log("create_room:"+ result)
          }
         
          _notify("createroom_resp",err,result.data,callindex)
      })
        break;



      default:
        console.log(`未知的命令類型: ${cmdType}`);
    }
  });
  socket.on("disconnect", () => {
    console.log("客戶端:有人離開Server")
  })

})
console.log("Web伺服器就緒，開始接受用戶端連線.");
console.log("鍵盤「Ctrl + C」可結束伺服器程式.");

//聊天室
// const chat = require('../function/chat');
// chat(io);
// const PORT = process.env.PORT || 3000;

// server.listen(PORT,()=>{
//     console.log('Server is running on port ${PORT}');
// })
