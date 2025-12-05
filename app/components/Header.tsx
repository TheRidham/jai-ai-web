'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const Header = () => {

  const pathname = usePathname();

  return (
    <header className="bg-white shadow z-50">
      <div className="px-4 py-3 text-center flex justify-between items-center max-w-screen-xl m-auto">
        <h1 className="text-2xl font-bold">Jai AI Web</h1>
        <nav>
          {pathname==='/admin' ?
            <button
              className='bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer'
            >
              <Link href={'/login'}>
                Advisor Login
              </Link>
            </button>
            :
            <button
              className='bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer'
            >
              <Link href={'/admin'}>
                Admin Login
              </Link>
            </button>

          }
        </nav>
      </div>
    </header>
  )
}

export default Header