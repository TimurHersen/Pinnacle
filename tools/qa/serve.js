// A static server over the repository for the length of one script (no long-running server needed).
// require('./serve.js')(port) -> Promise<server>; call server.close() at the end.
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml'};
module.exports=(port=+(process.env.PORT||8123))=>new Promise((res,rej)=>{const s=http.createServer((q,r)=>{let f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));
  if(!f.startsWith(ROOT)){r.writeHead(403);return r.end();}if(f.endsWith(path.sep))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});r.end(d);});});
  s.on('error',rej);s.listen(port,'127.0.0.1',()=>res(s));});
