'use client';

import { useState, useEffect } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeError } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
  }
  return stripePromise;
}

function DonationFormContent() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    amount: '100',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage({ type: 'error', text: 'Stripe is not loaded. Please refresh the page.' });
      return;
    }

    if (!formData.email || !formData.name) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Create a token from the card element
      const { token, error } = await stripe.createToken(elements.getElement(CardElement)!);

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to create payment token' });
        setLoading(false);
        return;
      }

      if (!token) {
        setMessage({ type: 'error', text: 'Failed to create payment token' });
        setLoading(false);
        return;
      }

      // Send token to backend
      const response = await fetch('/api/donate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.id,
          email: formData.email,
          name: formData.name,
          amount: parseInt(formData.amount, 10),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setFormData({ name: '', email: '', amount: '100' });
        elements.getElement(CardElement)?.clear();
      } else {
        setMessage({ type: 'error', text: data.error || 'Donation failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Make a Donation</CardTitle>
        <CardDescription>Support our cause with a secure donation</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Message Display */}
          {message && (
            <Alert
              className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription
                className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
              required
            />
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              required
            />
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Donation Amount (cents)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">$</span>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="100"
                value={formData.amount}
                onChange={handleInputChange}
                disabled={loading}
                min="1"
                required
              />
              <span className="text-sm text-gray-600">.00</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter amount in cents (e.g., 100 = $1.00)</p>
          </div>

          {/* Card Element */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
            <div className="border border-gray-300 rounded-lg p-3 bg-white">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#fa755a',
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !stripe}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Donate $${(parseInt(formData.amount, 10) / 100).toFixed(2)}`
            )}
          </Button>
        </form>

        {/* Security Info */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Your payment information is secure and encrypted
        </p>
      </CardContent>
    </Card>
  );
}

export default DonationFormContent;
