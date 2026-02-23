# API Testing Plan - `src` Architecture

This guide provides specific request details to test the new MVC-based endpoints in the `src` folder using **Postman** or **Thunder Client**.

## 1. Authentication (Get Your Token)

Before testing any protected APIs, you must log in to obtain a JWT token.

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/auth/login`
- **Headers**:
  - `Content-Type: application/json`
- **Body (JSON)**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **Action**: Copy the value of `token` from the response.

---

## 2. Setting Up Authentication in Postman

For all subsequent requests:
1. Go to the **Auth** tab in Postman/Thunder Client.
2. Select **Bearer Token**.
3. Paste the token you copied from Step 1.

---

## 3. Test: Dashboard Attendance (GET)
*Verifies regular user access and service integration.*

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/dashboard/attendance`
- **Auth**: Bearer Token required
- **Expected Result**: A JSON object containing `today` attendance and `thisMonth` statistics.

---

## 4. Test: Mark Holiday (POST)
*Verifies Admin authorization and state-changing logic.*

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/attendance/mark-holiday`
- **Auth**: Bearer Token required (**must be an Admin account**)
- **Headers**:
  - `Content-Type: application/json`
- **Body (JSON)**:
  ```json
  {
    "date": "2024-03-25",
    "holidayName": "Test Holiday",
    "markAllPresent": true
  }
  ```
- **Expected Result**: Success message and count of users marked present.

---

## 5. Test: Get User Profile (GET)
*Verifies dynamic routing and multi-tenancy isolation.*

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/users/[USER_ID]` (Replace `[USER_ID]` with a real ID)
- **Auth**: Bearer Token required
- **Expected Result**: User details. Note: Regular users can only see their own ID; Admins can see any ID within their tenant.

---

## Troubleshooting common errors
- **401 Unauthorized**: Token is missing or invalid. Check your Bearer token.
- **403 Forbidden**: You are trying to access an Admin-only endpoint (like Mark Holiday) with a regular User account.
- **404 Not Found**: The endpoint path is incorrect or the record (like User ID) doesn't exist.
- **405 Method Not Allowed**: You used GET instead of POST (or vice versa).
