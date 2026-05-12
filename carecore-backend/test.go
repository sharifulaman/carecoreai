curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@carecore.com",
    "password": "Admin1234",
    "full_name": "System Admin",
    "role": "admin"
  }'


  curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@carecore.com",
    "password": "Admin1234"
  }'


  curl http://localhost:8080/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"



  curl -X POST http://localhost:8080/entities/Home \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTNiMTgxMmEtMTYyOC00ZWI3LTk3NjktODY0ZDNhNzgxNzU4IiwiZW1haWwiOiJhZG1pbkBjYXJlY29yZS5jb20iLCJvcmdfaWQiOiJkZWZhdWx0X29yZyIsInJvbGUiOiJhZG1pbiIsImhvbWVfaWRzIjpudWxsLCJpc3MiOiJjYXJlY29yZS5hdXRoIiwic3ViIjoiYWRtaW5AY2FyZWNvcmUuY29tIiwiYXVkIjpbImNhcmVjb3JlLWFwaSJdLCJleHAiOjE3Nzg1OTA1NTAsImlhdCI6MTc3ODU2MTc1MH0.rQ0nk-0JUC9JjwPSfSaZFXQeRpS-olMncpHkynbKma0" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Sunrise House",
      "type": "24_hours",
      "address": "12 Oak Street, London",
      "postcode": "E1 6RF",
      "team_leader_id": "PASTE_STAFF_ID_HERE",
      "status": "active"
    }
  }'


  curl http://localhost:8080/entities/Home \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"



  curl -X POST http://localhost:8080/entities/Resident \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "display_name": "Alice M.",
      "home_id": "PASTE_HOME_ID_HERE",
      "risk_level": "low",
      "status": "active",
      "placement_type": "childrens_home"
    }
  }'


  curl "http://localhost:8080/entities/Resident?status=active" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"


  curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
