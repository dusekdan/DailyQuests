from http.server import HTTPServer, BaseHTTPRequestHandler, SimpleHTTPRequestHandler, ThreadingHTTPServer


import ssl

# generating key.pem and cert.pem via commandline openssl
# openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
# it will ask for password, which will have to be provided any time server is started via script
# source: https://anvileight.com/blog/posts/simple-python-http-server/

def attempt_1():
    """
    Ended up not working from firefox/edge, possibly due to reasons
    described in: https://stackoverflow.com/a/52067379

    Browsers possibly hold open the connection, which causes hanging of the server.
    The solution would be inheriting from something that users threading for serving.

    I was able to call it from powershell with invoke request, when I overriden the
    policy for verifying TLS: https://stackoverflow.com/a/34333229/

    Then the server cried that do_GET was not implemented -> this is because of BaseHTTPRequestHandler being used
    and no proper implementation being in place. This is not an issue with SimpleHTTPRequestHandler.
    """
    httpd = HTTPServer(('localhost', 4443), BaseHTTPRequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket, keyfile="key.pem", certfile="cert.pem", server_side=False)
    httpd.serve_forever()

def attempt_2():
    """
    There were some deprecations in python3, so updated version from 11 MAY 2023 is this attempt:
    https://gist.github.com/DannyHinshaw/a3ac5991d66a2fe6d97a569c6cdac534?permalink_comment_id=4565141#gistcomment-4565141
    
    Result: Works and provides output through command line with cert ignore policy as in attempt_1, but ends up being 
    "connection reset" for firefox, edge.
    """
    server_address = ('', 4443)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    ctx = ssl.SSLContext(protocol=ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()

def attempt_3():
    """
    Using approach from attempt_2, but will use ThreadingHTTPServer to create a server instance instead
    to see whether it fixes problem for Edge/Firefox requests.

    Result: It doesn't solve the problem - note: I was actually not putting https infront of the 127.0.0.1:4443,
    then it started working, but the app is still not offered for the install. Probably a separate issue.
    """
    server_address = ('0.0.0.0', 4443)
    httpd = ThreadingHTTPServer(server_address, SimpleHTTPRequestHandler)
    ctx = ssl.SSLContext(protocol=ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    ctx.set_alpn_protocols(['http/1.1'])
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()

attempt_2()