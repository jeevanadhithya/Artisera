#!/usr/bin/env python3
import sys, json, urllib.request

BACKEND_URL = sys.argv[1] if len(sys.argv) > 1 else "https://artisera-backend.vercel.app"

def get_public_ip():
    for service_url in ["https://api.ipify.org", "https://checkip.amazonaws.com", "https://ifconfig.me/ip"]:
        try:
            req = urllib.request.Request(service_url, headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=4) as res:
                ip = res.read().decode("utf-8").strip()
                if ip: return ip
        except Exception:
            continue
    return None

def register_with_backend(ip, backend_url):
    config_url = f"{backend_url.rstrip('/')}/api/ml/config"
    aws_url = f"http://{ip}:8000"
    payload = json.dumps({"aws_url": aws_url, "ip": ip}).encode("utf-8")
    req = urllib.request.Request(config_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            print(f"Successfully registered EC2 IP {ip} ({aws_url}) with {config_url}:")
            print(res.read().decode("utf-8"))
            return True
    except Exception as e:
        print(f"Failed to register with {config_url}: {e}")
        return False

if __name__ == "__main__":
    my_ip = get_public_ip()
    if my_ip:
        register_with_backend(my_ip, BACKEND_URL)
