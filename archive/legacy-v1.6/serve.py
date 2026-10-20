from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import socket
import webbrowser

ROOT = Path(__file__).resolve().parent / "public"
PORT = 8000

class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True

try:
    lan = socket.gethostbyname(socket.gethostname())
except Exception:
    lan = "TU-IP-LOCAL"

handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))

print("=" * 58)
print(" FACTORY WARS v1.6 · IMPERIOS · LIGA 10")
print("=" * 58)
print(f"Sirviendo carpeta: {ROOT}")
print(f"PC:                 http://localhost:{PORT}/")
print(f"Misma Wi-Fi:        http://{lan}:{PORT}/")
print("Ctrl+C para detener.")
print("=" * 58)

try:
    server = ReusableThreadingHTTPServer(("0.0.0.0", PORT), handler)
except OSError as exc:
    print("\nERROR: el puerto 8000 ya está ocupado.")
    print("Cerrá las otras terminales Python con Ctrl+C y volvé a ejecutar START_WINDOWS.bat.")
    print(f"Detalle: {exc}")
    raise SystemExit(1)

try:
    webbrowser.open(f"http://localhost:{PORT}/")
    server.serve_forever()
except KeyboardInterrupt:
    print("\nServidor detenido.")
finally:
    server.server_close()
