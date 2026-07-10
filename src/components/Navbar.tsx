'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

export const Navbar = () => {
  const t = useTranslations('General');

  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const clearSearch = () => {
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 40px',
        backgroundColor: 'rgba(20, 20, 25, 0.75)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      {/* Brand Logo / Title */}
      <div
        style={{
          fontWeight: 800,
          fontSize: '20px',
          letterSpacing: '0.05em',
          color: '#ef4444',
        }}
      >
        {t('title')}
      </div>

      {/* Search Bar with Clear Button */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
          className="w-full pl-10 pr-12 py-2 rounded-lg border border-gray-300 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{ minHeight: '44px' }}
        />

        {/* Search Icon */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

        {/* Clear Button - Shows only when text exists */}
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Clear search"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Tabs / Links */}
      <div
        style={{
          display: 'flex',
          gap: '28px',
          fontSize: '14px',
          fontWeight: 500,
          flexWrap: 'wrap',
        }}
      >
        <a
          href="#home"
          style={{
            color: '#f3f4f6',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#f3f4f6';
          }}
        >
          {t('home')}
        </a>
        <a
          href="#about"
          style={{
            color: '#9ca3af',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          {t('about')}
        </a>
        <a
          href="#events"
          style={{
            color: '#9ca3af',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          {t('events')}
        </a>
        <a
          href="#projects"
          style={{
            color: '#9ca3af',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          {t('projects')}
        </a>
        <a
          href="#contact"
          style={{
            color: '#9ca3af',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          {t('contact')}
        </a>
      </div>

      {/* Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            color: '#f3f4f6',
            fontSize: '13px',
            fontWeight: 600,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          {t('join')}
        </button>
        <LanguageSwitcher />
      </div>
    </nav>
  );
};
