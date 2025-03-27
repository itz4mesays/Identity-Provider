import express, { Request, Response, Router } from 'express'
import { successResponse } from '../utils/responseHandler';
import { getUserByTaxId } from '../services/account.service';
import { generateSamlResponse } from '../utils/saml.helper';
import SamlEncryptor from '../utils/saml-encryption';
import bcrypt from 'bcrypt'

const router: Router = express.Router();

// Define a basic route
router.get('/', (req: Request, res: Response): Response => {
    return successResponse(res, 200, {}, "Single-Sign-On Service");
});

// Handle SAML Login Request
router.get('/sso/login', (req: Request, res: Response) => {
    // Get the error message from query parameters
    const error = req.query.error;

    // Send a styled login form with error message (if any)
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login Page</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f9;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .login-container {
          background-color: #ffffff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .login-container h1 {
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 24px;
        }
        .login-container label {
          display: block;
          margin-bottom: 0.5rem;
          color: #555;
          font-size: 14px;
          text-align: left;
        }
        .login-container input {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .login-container input:focus {
          border-color: #007bff;
          outline: none;
        }
        .login-container button {
          width: 100%;
          padding: 0.75rem;
          background-color: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        .login-container button:hover {
          background-color: #0056b3;
        }
        .login-container .error {
          color: #dc3545;
          margin-bottom: 1rem;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>Identity Provider Authentication</h1>
        ${error ? `<div class="error">${error}</div>` : ''}
        <form action="/sso/acs" method="POST">
          <label for="taxid">Tax ID:</label>
          <input type="text" id="taxid" name="taxid" required>
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Handle SAML Response
router.post('/sso/acs', async (req: Request, res: Response) => {
    const { taxid, password } = req.body;

    try {
        // Input validation
        if (!taxid || !password) {
            return res.redirect('/sso/login?error=Tax ID and password are required');
        }

        // Get user by tax id
        const user = await getUserByTaxId(taxid);
        if (!user) {
            return res.redirect('/sso/login?error=Tax ID does not exist');
        }

        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.redirect('/sso/login?error=Invalid Tax ID or Password');
        }

        try {
            const samlResponse = generateSamlResponse(user);
            const assertion = samlResponse;
            const encrypted = await SamlEncryptor.encryptAssertion(assertion);
            const base64Response = Buffer.from(encrypted).toString('base64');

            res.send(`
              <form method="post" action="${process.env.SP_ACS_URL}">
                  <input type="hidden" name="SAMLResponse" value="${base64Response}">
                  <script>document.forms[0].submit()</script>
              </form>
          `);
        } catch (error) {
            console.error('SAML Processing Error:', error);
            res.status(500).send('Authentication failed');
        }
    } catch (err) {
        console.error("Error during authentication:", err);
        res.status(500).send("Internal Server Error");
    }
})


export default router