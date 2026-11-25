import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
site=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
srv=subprocess.Popen(['python3','-m','http.server','8765','--bind','127.0.0.1'],cwd=site,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    page_name=sys.argv[1]; out=sys.argv[2]
    clip=None
    with sync_playwright() as p:
        b=p.chromium.launch()
        pg=b.new_page(viewport={'width':1200,'height':900})
        errs=[]
        pg.on('console',lambda m: errs.append(m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
        pg.goto('http://127.0.0.1:8765/'+page_name)
        pg.wait_for_timeout(800)
        sel = sys.argv[3] if len(sys.argv)>3 else None
        if sel:
            el=pg.query_selector(sel)
            el.scroll_into_view_if_needed()
            el.screenshot(path=out)
        else:
            pg.screenshot(path=out,full_page=False)
        print('errors:',errs[:10])
        b.close()
finally:
    srv.terminate()
