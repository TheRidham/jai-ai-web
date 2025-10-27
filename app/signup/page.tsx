'use client';

import { auth, db, setupRecaptcha } from '@/lib/firebase';
import { signInWithPhoneNumber, ConfirmationResult, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

type Step = 'phone' | 'otp' | 'profile';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (step === 'phone') {
      try {
        setupRecaptcha('recaptcha-container');
      } catch (error) {
        console.error('Error setting up recaptcha:', error);
        setError('Failed to initialize verification. Please refresh the page.');
      }
    }
  }, [step]);

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    return phone;
  };

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const recaptchaVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to send OTP');
      console.log(error)
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await confirmationResult?.confirm(otp);
      if (result?.user) {
        setStep('profile');
      }
    } catch {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (expertise.length === 0) {
      setError('Please select at least one expertise area');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not found');

      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, 'advisors', user.uid), {
        name,
        phone: phoneNumber,
        expertise,
        createdAt: new Date().toISOString(),
        isActive: true
      });

      router.push('/advisor');
    } catch {
      setError('Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpertise = (area: string) => {
    setExpertise(prev => 
      prev.includes(area) 
        ? prev.filter(e => e !== area)
        : [...prev, area]
    );
  };

  const expertiseAreas = [
    'Career Guidance', 'Life Coaching', 'Mental Health', 'Relationship',
    'Financial Planning', 'Education', 'Business', 'Technology',
    'Health & Fitness', 'Spiritual Guidance'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create Advisor Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Step {step === 'phone' ? '1' : step === 'otp' ? '2' : '3'} of 3
          </p>
        </div>

        {step === 'phone' && (
          <form onSubmit={sendOTP} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+91XXXXXXXXXX"
              />
            </div>
            <div id="recaptcha-container"></div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOTP} className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">OTP sent to {phoneNumber}</p>
            </div>
            <div>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl"
                placeholder="000000"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={completeProfile} className="space-y-6">
            <div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expertise Areas
              </label>
              <div className="grid grid-cols-2 gap-2">
                {expertiseAreas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleExpertise(area)}
                    className={`px-3 py-2 text-xs rounded-md border ${
                      expertise.includes(area)
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/signin" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
