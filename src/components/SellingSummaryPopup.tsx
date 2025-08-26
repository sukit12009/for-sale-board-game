import React from 'react';
import { PropertyCard, MoneyCard } from '@/types/game';
import { PropertyCardComponent, MoneyCardComponent } from './GameCard';

interface SellingSummaryData {
  playerId: string;
  playerName: string;
  propertyCard: PropertyCard;
  moneyCard: MoneyCard | null;
  moneyReceived: number;
}

interface SellingSummaryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SellingSummaryData[];
  round: number;
}

export default function SellingSummaryPopup({
  isOpen,
  onClose,
  summary,
  round
}: SellingSummaryPopupProps) {
  console.log('📋 [DEBUG] SellingSummaryPopup render:', { isOpen, summaryLength: summary.length, round });
  
  if (!isOpen) {
    console.log('📋 [DEBUG] SellingSummaryPopup not open');
    return null;
  }
  
  if (!summary || summary.length === 0) {
    console.log('📋 [DEBUG] SellingSummaryPopup no summary data');
    return null;
  }

  console.log('📋 [DEBUG] SellingSummaryPopup rendering popup!');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto transform animate-slideInUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-xl text-center">
          <div className="text-4xl mb-2">📋</div>
          <h2 className="text-xl font-bold">สรุปผลการขายบ้าน</h2>
          <p className="text-purple-100 mt-1">รอบที่ {round}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 text-center text-lg font-semibold mb-4">
            ผลการขายบ้านในรอบนี้ 🏠💰
          </p>

          {/* Summary Table */}
          <div className="space-y-3">
            {summary.map((item, index) => (
              <div 
                key={item.playerId} 
                className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-400"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Player Name */}
                    <div className="font-semibold text-gray-800">
                      {item.playerName}
                    </div>

                    {/* Property Card */}
                    <div className="transform scale-75">
                      <PropertyCardComponent
                        card={item.propertyCard}
                        size="small"
                      />
                    </div>

                    <div className="text-gray-500 text-sm">→</div>

                    {/* Money Card */}
                    {item.moneyCard && (
                      <div className="transform scale-75">
                        <MoneyCardComponent
                          card={item.moneyCard}
                          size="small"
                        />
                      </div>
                    )}
                  </div>

                  {/* Money Amount */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ฿{item.moneyReceived.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      ขายบ้านหลัง {item.propertyCard.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="bg-purple-100 rounded-lg p-4 mt-6">
            <div className="text-center">
              <div className="text-sm text-purple-600 mb-1">เงินรวมที่แจกในรอบนี้</div>
              <div className="text-2xl font-bold text-purple-800">
                ฿{summary.reduce((total, item) => total + item.moneyReceived, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            ตกลง ✨
          </button>
        </div>
      </div>
    </div>
  );
} 