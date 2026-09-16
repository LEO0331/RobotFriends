import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Account from './Account';
import { supabase } from '../auth/client';

jest.mock('../auth/client', () => ({
  redirectUrl: () => 'http://localhost/RobotFriends',
  supabase: { auth: {
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signInWithPassword: jest.fn(), signUp: jest.fn(), resetPasswordForEmail: jest.fn()
  } }
}));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
});
test('failed login displays provider error without closing the dialog', async () => {
  supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
  render(<Account language="en" weight={100} onPreferences={() => {}}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
  fireEvent.submit(screen.getByLabelText('Email').closest('form'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Invalid login credentials'));
  expect(screen.getByRole('dialog')).toBeVisible();
});
test('signup with confirmation required keeps user in confirmation state', async () => {
  supabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  render(<Account language="en" weight={100} onPreferences={() => {}}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'strong-password' } });
  fireEvent.submit(screen.getByLabelText('Email').closest('form'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Check your email'));
  expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: 'http://localhost/RobotFriends' } }));
});
