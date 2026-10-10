import { NextResponse } from 'next/server';

// In-memory cache for IFSC lookups
const ifscCache = new Map<string, { bank: string; branch: string; address: string; city: string }>();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code) {
    return NextResponse.json({ error: { message: 'IFSC code is required' } }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanCode)) {
    return NextResponse.json(
      { error: { message: 'Invalid IFSC format. Must be 11 alphanumeric characters.' } },
      { status: 400 }
    );
  }

  if (ifscCache.has(cleanCode)) {
    return NextResponse.json({ success: true, data: ifscCache.get(cleanCode) });
  }

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${cleanCode}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: { message: 'IFSC lookup failed. Please enter bank and branch manually.' } },
        { status: 404 }
      );
    }

    const data = await res.json();
    const result = {
      bank: data.BANK || '',
      branch: data.BRANCH || '',
      address: data.ADDRESS || '',
      city: data.CITY || '',
    };

    ifscCache.set(cleanCode, result);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.warn('Razorpay IFSC API unavailable, falling back to manual entry:', err);
    return NextResponse.json(
      { error: { message: 'IFSC service unavailable. Please enter bank and branch manually.' } },
      { status: 503 }
    );
  }
}
