var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');

var router = express.Router(); 
var app = express();

app.listen(8081);

app.use(express.query());
app.use(bodyParser.json({limit: '50mb'})); 
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));

app.get('/', function (req, res) {
	res.send('helloworld');
})

var api_app = {
	updateVersion: function(req, res) {
		var obj = {
			version: req.body.version || '',
			description: req.body.description || '',
			path: req.body.path || '',
			os: req.body.os || '',
			updatetime: req.body.time || ''
		}
		console.log(req.body)
		console.log(obj)
		if(!req.body.version) {
			res.sendErr('err');
		}
		fs.readFile('./version.json', 'utf8', function(err, data){
			if(!data) {
				var data = {
					historyVersion: [],
				}
			} else {
				data = JSON.parse(data);
			}
			var len = data.historyVersion.length,
				shouldAdd = true;
			for(var i = 0; i < len; i++){
				if(data.historyVersion[i].version == obj.version){
					//更新版本信息
					data.historyVersion[i].description = obj.description || data.historyVersion[i].description;
					data.historyVersion[i].path = obj.path || data.historyVersion[i].path;
					data.historyVersion[i].os = obj.os || data.historyVersion[i].os;
					data.historyVersion[i].updatetime = obj.updatetime || data.historyVersion[i].updatetime;
					shouldAdd = false;
				}
			}
			if(shouldAdd){
				data.historyVersion.push(obj);
			}
			fs.writeFile('./version.json', JSON.stringify(data),function(err){
				if(err) {
					res.send('fail');
					console.log('写文件操作失败');
				} else {
					res.send('sussce');
					console.log('写文件操作成功');
				}
			});
		});
	},
	
	getList: function(req, res) {
		fs.readFile('./version.json', 'utf8', function(err, data){
			console.log(data);  
			if(!data){
				res.send([]);
			} else {
				data = JSON.parse(data).historyVersion;
				res.send(data);
			}
		});
	},
	
	getVersion: function(req, res) {
		var version = req.body.version;
		fs.readFile('./version.json', 'utf8', function(err, data){
			console.log(data);  
			data = JSON.parse(data).historyVersion;
			for(var i = 0; i < data.length; i++){
				if(data[i].version == version) {
					res.send(data[i]);
				}
			}
			res.send(null);
		});
	},
}

var interfacePostAndGetProc = function(req, res){
	var matrrr = req.url.match(/^\/api\/([^\?]+)/);
	var jsonpCallBack = "";
	if(req.url.match(/callback\=([^\&]+)/)){
		jsonpCallBack = req.url.match(/callback\=([^\&]+)/)[1];
	}
	var interfaceName = matrrr[1];
	var resObj = {
		res:res,
		send:function(obj){
			var returnObj = {msg:"", status:true, data:obj};
			if(jsonpCallBack){
				this.res.send(jsonpCallBack+"("+JSON.stringify(returnObj)+")");
			}
			else{
				this.res.send(returnObj);
			}
			
			return this.res;
		},
		sendErr:function(msg,type){
			var returnObj = {msg:msg, status:false, type:!type?"":type};
			if(jsonpCallBack){
				this.res.send(jsonpCallBack+"("+JSON.stringify(returnObj)+")");
			}
			else{
				this.res.send(returnObj);
			}
			this.res.end();
		}
	}
	////开始判断来源domain是否符合规定
	var referer = req.get("Referer");
	var allowDomain = "";
	//console.log(referer);
	if(referer ){
		var matchResult = referer.match(/http:\/\/([^\/]+)/);
		if(matchResult){
			referer = matchResult[1];
			if(referer == "localhost:8081"){
				allowDomain = referer;
			}
		}
	}
	//如果用get方式传入了参数，把get的参数填入req.body中，以确保和post的参数在一个位置
	if(req.url.match(/\?([\d\D]+)/)){
		var paramStr = req.url.match(/\?([\d\D]+)/)[1];
		//console.log(paramStr);
		if(!req.body){
			req.body = {};
		}
		var strs = paramStr.split("&");
		for(var i = 0; i < strs.length; i++) {
			if(!req.body[strs[i].split("=")[0]]){
				req.body[strs[i].split("=")[0]] = strs[i].split("=")[1];
			}
		}
		//console.log(req.body)
	}
	
	
	if(allowDomain){
		res.header("Access-Control-Allow-Origin", "http://" + allowDomain);
	}
	
	if((typeof api_app[interfaceName])+"" == "function"){
		api_app[interfaceName](req, resObj);
	}
	else{
		resObj.sendErr(" 没有找到对应的api。");
	}
}

router.get(/^\/api\/[\d\D]+$/i, interfacePostAndGetProc);
router.post(/^\/api\/[\d\D]+$/i, interfacePostAndGetProc);

app.use("/",router)

