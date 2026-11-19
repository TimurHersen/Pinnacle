# ed.py <tool> <args.json> <outprefix> : submit a PixelLab image job (image paths in "image_urls"/"frame_urls"/"reference_image_url"
# become data URLs), wait for it, save its frames as <outprefix>-N.png
import sys,json,re,base64,subprocess,time
tool,argf,out=sys.argv[1],sys.argv[2],sys.argv[3]
a=json.load(open(argf))
u=lambda p:p if p.startswith(("http","data:","upload:")) else "data:image/png;base64,"+base64.b64encode(open(p,"rb").read()).decode()
for k in ("image_urls","frame_urls"):
    if k in a:a[k]=[u(p) for p in a[k]]
if "reference_image_url" in a:a["reference_image_url"]=u(a["reference_image_url"])
def call(name,args):
    json.dump({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":name,"arguments":args}},open(out+".body.json","w"))
    raw=subprocess.run(["curl","-sS","-m","180","https://api.pixellab.ai/mcp","-H","Content-Type: application/json","-H","Accept: application/json, text/event-stream","-d","@"+out+".body.json"],capture_output=True,text=True).stdout
    return json.loads(re.search(r'\{.*\}',raw,re.S).group(0))
d=call(tool,a);txt=" ".join(c.get("text","") for c in d.get("result",{}).get("content",[]))
m=re.search(r'job[_ ]id[s]?\W+([0-9a-f-]{36})',txt,re.I) or re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})',txt)
if not m:print("NOJOB",txt[:600],d.get("error"));sys.exit(1)
job=m.group(1);print("job",job,flush=True)
for i in range(60):
    time.sleep(15);r=call("get_image",{"job_id":job});n=0
    for c in r.get("result",{}).get("content",[]):
        if c.get("type")=="image":open(f"{out}-{n}.png","wb").write(base64.b64decode(c["data"]));n+=1
    t=" ".join(c.get("text","") for c in r.get("result",{}).get("content",[]))
    if n:print("saved",n);break
    if re.search(r'fail|error',t,re.I):print("FAILED",t[:400]);break
