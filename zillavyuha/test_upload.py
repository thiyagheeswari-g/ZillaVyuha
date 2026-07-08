import requests
import os

url = 'http://localhost:8090/upload'
files_dir = 'sample_data'
files_to_upload = [
    'bed_availability.csv',
    'doctor_attendance.csv',
    'lab_availability.csv',
    'medicine_inventory.csv',
    'patient_footfall.csv'
]

files = []
for filename in files_to_upload:
    path = os.path.join(files_dir, filename)
    files.append(('files', (filename, open(path, 'rb'), 'text/csv')))

print(f"Uploading {len(files)} files...")
response = requests.post(url, files=files)

print(response.status_code)
print(response.json())
