import React from 'react';
import { PropertyCard, MoneyCard } from '@/types/game';
import { PropertyCardComponent, MoneyCardComponent } from './GameCard';

interface ResultPopupProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'property' | 'money';
  card: PropertyCard | MoneyCard | null;
  title: string;
  message: string;
}

export default function ResultPopup({
  isOpen,
  onClose,
  type,
  card,
  title,
  message
}: ResultPopupProps) {
  console.log('🚨 [DEBUG] ResultPopup render:', { isOpen, type, card: !!card, title });
  
  if (!isOpen) {
    console.log('🚨 [DEBUG] ResultPopup not open');
    return null;
  }
  
  if (!card) {
    console.log('🚨 [DEBUG] ResultPopup no card');
    return null;
  }
  
  console.log('🚨 [DEBUG] ResultPopup rendering popup!');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform animate-slideInUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-t-xl text-center">
          <div className="text-4xl mb-2">
            {type === 'property' ? '🏠' : '💰'}
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          {/* Message */}
          <p className="text-gray-700 text-lg">{message}</p>

          {/* Card Display */}
          <div className="flex justify-center transform hover:scale-105 transition-transform duration-200">
            {type === 'property' ? (
              <PropertyCardComponent 
                card={card as PropertyCard} 
                size="large"
              />
            ) : (
              <MoneyCardComponent 
                card={card as MoneyCard} 
                size="large"
              />
            )}
          </div>

          {/* Value Display */}
          <div className="bg-yellow-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-800">
              {type === 'property' 
                ? `บ้านหลัง ${card.value}` 
                : `฿${card.value.toLocaleString()}`
              }
            </div>
            <div className="text-sm text-yellow-600">
              {type === 'property' ? 'มูลค่าบ้าน' : 'จำนวนเงิน'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            ตกลง ✨
          </button>
        </div>
      </div>
    </div>
  );
}

// Animation CSS (ใส่ใน globals.css)
const animationCSS = `
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideInUp {
  animation: slideInUp 0.3s ease-out;
}
`;

export { animationCSS }; 