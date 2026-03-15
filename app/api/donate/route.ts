import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email, name, amount } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Payment token is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create a charge with the token
    const charge = await stripe.charges.create({
      amount: amount || 100, // Amount in cents ($1.00 = 100 cents)
      currency: 'usd',
      source: token,
      description: `Donation from ${name || 'Anonymous'}`,
      receipt_email: email,
      metadata: {
        name: name || 'Anonymous',
        email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Donation successful! Thank you for your support.',
        chargeId: charge.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Donation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred while processing your donation.',
      },
      { status: 400 }
    );
  }
}
