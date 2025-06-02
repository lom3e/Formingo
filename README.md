# Formingo

**API for contact forms** with email sending, spam protection, and message storage.

Formingo is a simple and customizable backend API to handle contact forms on any website without relying on external services.  
It supports sending notification emails to the site owner, storing messages in a database, sending confirmation emails to users, and integrating spam protection like reCAPTCHA.

## Features

- Receive and process contact form submissions  
- Send email notifications to administrators  
- Optional storage of messages in a database  
- Send confirmation emails to users  
- Spam protection via reCAPTCHA or similar  
- Easy to customize fields and validations  

## Getting Started

1. Clone the repository  
2. Install dependencies with `npm install`  
3. Start the server with `node index.js`  
4. API runs on `http://localhost:3000` by default  

## Usage

Send a POST request to `/contact` with JSON body containing form fields like:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "message": "Hello, I would like to get in touch.",
  "privacyAccepted": true
}
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.

Made with ❤️ by Matteo
