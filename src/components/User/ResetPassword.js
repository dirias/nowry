import React, { useState } from 'react';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSuccessful, setResetSuccessful] = useState(false);

  const handleResetPassword = () => {
    // Implement your password reset logic here.
    // This could involve making an API request to update the password.

    // Assuming the reset was successful, set resetSuccessful to true.
    setResetSuccessful(true);
  };

  return (
    <div className="content">
      <div className="auth-container">
        <h2>Reset Password</h2>
        {resetSuccessful ? (
          <div className="reset-success-message">
            Your password has been successfully reset.
            <p>
              <a href="/login">Click here to login</a>
            </p>
          </div>
        ) : (
          <form>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
            <button type="button" onClick={handleResetPassword} className="btn-primary">
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
