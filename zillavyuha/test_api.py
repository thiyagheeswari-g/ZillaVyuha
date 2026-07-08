import requests
import json
import time

url = "http://localhost:8090"

try:
    print("Checking /data...")
    r = requests.get(f"{url}/data")
    print("Status Code:", r.status_code)
    print("Response:")
    print(json.dumps(r.json(), indent=2))
    
    status = r.json().get("district_status")
    if not status:
        print("\nData is empty. Triggering /upload via preload...")
        files = [('files', ('lab_availability.csv', open('sample_data/lab_availability.csv', 'rb'), 'text/csv'))]
        print("Sending upload request...")
        upload_resp = requests.post(f"{url}/upload", files=files)
        print("Upload Response Code:", upload_resp.status_code)
        
        print("\nChecking /data again...")
        r = requests.get(f"{url}/data")
        print("Response:")
        print(json.dumps(r.json(), indent=2))
        
except Exception as e:
    print("Error:", e)
