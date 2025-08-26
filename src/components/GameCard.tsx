import React from 'react';
import { PropertyCard, MoneyCard } from '@/types/game';

interface PropertyCardProps {
  card: PropertyCard;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

interface MoneyCardProps {
  card: MoneyCard;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Property Card Component
export function PropertyCardComponent({ 
  card, 
  onClick, 
  selected = false, 
  disabled = false,
  size = 'medium' 
}: PropertyCardProps) {
  const getCardColor = (value: number): string => {
    if (value <= 8) return 'from-yellow-700 to-yellow-800'; // น้ำตาล - ไม้เก่า
    if (value <= 16) return 'from-gray-500 to-gray-600'; // เทา - บ้านเล็ก
    if (value <= 24) return 'from-blue-500 to-blue-600'; // ฟ้า - ตึกสูง
    return 'from-yellow-400 to-yellow-500'; // ทอง - บ้านหรู
  };

  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'small': return 'w-16 h-20 text-xs';
      case 'large': return 'w-32 h-40 text-lg';
      default: return 'w-24 h-32 text-sm';
    }
  };

  return (
    <div
      className={`
        ${getSizeClasses(size)}
        bg-gradient-to-br ${getCardColor(card.value)}
        rounded-lg border-2 border-white shadow-lg
        flex flex-col items-center justify-center
        text-white font-bold cursor-pointer
        transition-all duration-200 transform
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
        ${onClick && !disabled ? 'active:scale-95' : ''}
      `}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="text-center">
        <div className={`${size === 'large' ? 'text-2xl' : size === 'small' ? 'text-lg' : 'text-xl'} font-black mb-1`}>
          {card.value}
        </div>
        <div className={`${size === 'large' ? 'text-sm' : 'text-xs'} opacity-90`}>
          บ้าน
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1 left-1 w-2 h-2 bg-white bg-opacity-20 rounded-full"></div>
      <div className="absolute bottom-1 right-1 w-2 h-2 bg-white bg-opacity-20 rounded-full"></div>
    </div>
  );
}

// Money Card Component  
export function MoneyCardComponent({ 
  card, 
  onClick, 
  selected = false, 
  disabled = false,
  size = 'medium' 
}: MoneyCardProps) {
  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'small': return 'w-16 h-20 text-xs';
      case 'large': return 'w-32 h-40 text-lg';
      default: return 'w-24 h-32 text-sm';
    }
  };

  const formatMoney = (amount: number): string => {
    if (amount === 0) return '0';
    return amount.toLocaleString();
  };

  return (
    <div
      className={`
        ${getSizeClasses(size)}
        bg-gradient-to-br from-blue-50 to-blue-100
        rounded-lg border-2 border-blue-300 shadow-lg
        flex flex-col items-center justify-center
        text-blue-900 font-bold cursor-pointer
        transition-all duration-200 transform
        ${selected ? 'ring-4 ring-green-400 scale-105' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
        ${onClick && !disabled ? 'active:scale-95' : ''}
        relative overflow-hidden
      `}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Check pattern background */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-4 h-full w-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border border-blue-200"></div>
          ))}
        </div>
      </div>
      
      <div className="text-center relative z-10">
        <div className={`${size === 'large' ? 'text-xs' : 'text-xs'} opacity-70 mb-1`}>
          เช็คเงิน
        </div>
        <div className={`${size === 'large' ? 'text-lg' : size === 'small' ? 'text-sm' : 'text-base'} font-black`}>
          ฿{formatMoney(card.value)}
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1 right-1 text-blue-400 opacity-50">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    </div>
  );
}

// Card Back Component (for hidden cards)
export function CardBack({ 
  type, 
  size = 'medium',
  className = '' 
}: { 
  type: 'property' | 'money';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'small': return 'w-16 h-20';
      case 'large': return 'w-32 h-40';
      default: return 'w-24 h-32';
    }
  };

  const bgColor = type === 'property' 
    ? 'bg-gradient-to-br from-purple-600 to-purple-700' 
    : 'bg-gradient-to-br from-green-600 to-green-700';

  return (
    <div
      className={`
        ${getSizeClasses(size)}
        ${bgColor}
        rounded-lg border-2 border-white shadow-lg
        flex flex-col items-center justify-center
        text-white
        ${className}
      `}
    >
      <div className="text-center">
        <div className="text-xs opacity-80 mb-1">
          {type === 'property' ? 'บ้าน' : 'เงิน'}
        </div>
        <div className="text-lg">🏠</div>
      </div>
    </div>
  );
}

// Empty Card Slot Component
export function EmptyCardSlot({ 
  size = 'medium',
  className = '',
  label = 'ว่าง'
}: { 
  size?: 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
}) {
  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'small': return 'w-16 h-20 text-xs';
      case 'large': return 'w-32 h-40 text-lg';
      default: return 'w-24 h-32 text-sm';
    }
  };

  return (
    <div
      className={`
        ${getSizeClasses(size)}
        border-2 border-dashed border-gray-300
        rounded-lg
        flex items-center justify-center
        text-gray-400 font-medium
        bg-gray-50
        ${className}
      `}
    >
      {label}
    </div>
  );
} 