import React from 'react'

const Header: React.FC = () => {
  return (
    <>
      <h1>
        <img src="/images/logo.png" alt="Logo" height="256" width="256" />
      </h1>
      {/* Theme Switch */}
      <div className="theme-switch">
        <label htmlFor="theme-toggle">Dark Mode</label>
        <label className="switch">
          <input type="checkbox" id="theme-toggle" />
          <span className="slider"></span>
        </label>
      </div>
    </>
  )
}

export default Header
