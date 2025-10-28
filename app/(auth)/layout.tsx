import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

function layout({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main className="flex-1 py-2">{children}</main>
      <Footer/>
    </>
  )
}

export default layout