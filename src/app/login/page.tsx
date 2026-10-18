import React from 'react';
import Image from 'next/image';
import { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In | SIT Scholarship Portal',
  description: 'Sign in to access your student dashboard or administrative tools.',
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="gov-card p-6 border-gray-300">
        <div className="text-center pb-4 mb-4 border-b border-gray-200">
          <div className="flex justify-center mb-3">
            <Image
              src="/sit-logo.png"
              alt="SIT Logo"
              width={64}
              height={64}
              priority
              className="h-16 w-16 object-contain"
            />
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Siddaganga Institute of Technology, Tumakuru
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47] mt-1">
            Sign In to Scholarship Portal
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Sign in to access your student dashboard or administrative tools.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
