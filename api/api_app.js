
var fs = require('fs');

module.exports = function(){
	
	var updateVersion = function(req, res) {
		if(!req.body.version ||
			!/^[a-zA-Z]*[0-9]+\.[0-9]+\.[0-9]+$/.test(req.body.version) ) {
			res.sendErr('版本号有误！');
			return;
		}
		var obj = {
				version: req.body.version,
				description: req.body.description || '',
				androidPath: req.body.path || '',
				iosPath: req.body.os || '',
				updatetime: Date.parse(new Date())
			},
			versionNums = req.body.version.replace(/^[a-zA-Z]*/, '').split('.');
			
		fs.readFile('./version.json', 'utf8', function(err, data){
			if(!data) {
				var data = {
					historyVersion: [],
				}
			} else {
				data = JSON.parse(data);
			}
			var len = data.historyVersion.length,
				shouldAdd = true, versN = [];
			if(!len){
				data.historyVersion.push(obj);
			} else {
				
				for(var i = len - 1; i >= 0; i--){
					if(data.historyVersion[i].version.replace(/^[a-zA-Z]*/, '') == obj.version.replace(/^[a-zA-Z]*/, '')){
						//更新版本信息
						data.historyVersion[i].version = obj.version;
						data.historyVersion[i].description = obj.description || data.historyVersion[i].description;
						data.historyVersion[i].path = obj.path || data.historyVersion[i].path;
						data.historyVersion[i].os = obj.os || data.historyVersion[i].os;
						data.historyVersion[i].updatetime = Date.parse(new Date());
						shouldAdd = false;
						break;
					}
				}
				if(shouldAdd){
					//插入版本信息
					for(var i = len; i > 0; i--){
						versN = data.historyVersion[i-1].version.replace(/^[a-zA-Z]*/, '').split('.');
						if(versN[0]*1 > versionNums[0]*1){
							data.historyVersion[i] = data.historyVersion[i-1];
						} else if (versN[1]*1 > versionNums[1]*1){
							data.historyVersion[i] = data.historyVersion[i-1];
						} else if (versN[2]*1 > versionNums[2]*1) {
							data.historyVersion[i] = data.historyVersion[i-1];
						} else {
							data.historyVersion[i] = obj;
							break;
						}
					}
					if(!i) {
						data.historyVersion[i] = obj;
					}
				}
			}
			fs.writeFile('./version.json', JSON.stringify(data),function(err){
				if(err) {
					res.sendErr('fail');
				} else {
					res.send('success');
				}
			});
		});
	}
	
	var getVersionList = function(req, res) {
		fs.readFile('./version.json', 'utf8', function(err, data){
			// console.log(data);  
			if(err) {
				res.sendErr(err);
			} else
			if(!data){
				res.send([]);
			} else {
				data = JSON.parse(data).historyVersion;
				res.send(data);
			}
		});
	}
	
	var getVersion = function(req, res) {
		var version = req.body.version;
		fs.readFile('./version.json', 'utf8', function(err, data){
			// console.log(data);  
			if(err) {
				res.sendErr(err);
			} else
			if(!data){
				res.send(null);
			} else {
				data = JSON.parse(data).historyVersion;
				for(var i = 0; i < data.length; i++){
					if(data[i].version == version) {
						res.send(data[i]);
					}
				}
				res.send(null);
			}
		});
	}
	
	var getLastVersion = function(req, res) {
		
		fs.readFile('./version.json', 'utf8', function(err, data){
			// console.log(data);  
			if(err) {
				res.sendErr(err);
			} else
			if(!data){
				res.send(null);
			} else {
				data = JSON.parse(data).historyVersion;
				if(data.length) {
					res.send(data[data.length - 1]);
				} else {
					res.send(null);
				}
			}
		});
	}

	
	return {
		getVersionList: getVersionList,
		getVersion: getVersion,
		updateVersion: updateVersion,
		getLastVersion: getLastVersion,
	}
}()
