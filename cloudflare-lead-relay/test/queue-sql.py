import sqlite3,re,pathlib,concurrent.futures,tempfile
s=(pathlib.Path(__file__).parent/'../src/index.js').read_text()
claim=re.search(r'prepare\("(UPDATE leads SET status=\'processing\'.*?RETURNING.*?)"\)',s).group(1)
ack=re.search(r'prepare\("(UPDATE leads SET status=\?,processed_at=.*?)"\)',s).group(1)
fail=re.search(r'prepare\("(UPDATE leads SET status=\?,last_error=.*?)"\)',s).group(1)
with tempfile.TemporaryDirectory() as d:
 p=d+'/queue.db'
 def db():return sqlite3.connect(p,timeout=10)
 with db() as c:
  c.execute('CREATE TABLE leads(id INTEGER PRIMARY KEY,submission_id TEXT UNIQUE,payload_json TEXT,status TEXT,claimed_at TEXT,attempts INTEGER,processed_at TEXT,last_error TEXT)')
  c.execute("INSERT INTO leads VALUES(1,'fixture','{}','pending',NULL,0,NULL,NULL)")
 def get(_):
  with db() as c:return c.execute(claim,('2026-09-07T05:30:00Z','2026-09-07T05:24:00Z','2026-09-07T05:20:00Z')).fetchone()
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(get,range(8)))
 assert sum(r is not None for r in results)==1
 with db() as c:
  assert c.execute(ack,('processed','now',None,1,'fixture',2)).rowcount==0
  assert c.execute(fail,('pending','fixture error','2026-09-07T05:30:00Z',1,'fixture',1)).rowcount==1
 assert get(0) is None
 with db() as c:
  r=c.execute(claim,('2026-09-07T05:37:00Z','2026-09-07T05:31:00Z','2026-09-07T05:27:00Z')).fetchone();assert r[-1]==2
  assert c.execute(ack,('processed','now',None,1,'fixture',1)).rowcount==0
  assert c.execute(ack,('processed','now',None,1,'fixture',2)).rowcount==1
  assert c.execute(fail,('pending','bad','now',1,'fixture',2)).rowcount==0
print({'passed':8,'externalRequests':0,'parallelClaims':8})
