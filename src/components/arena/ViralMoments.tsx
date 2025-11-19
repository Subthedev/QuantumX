/**
 * VIRAL MOMENTS - Auto-detect and share dramatic moments
 *
 * Users become marketing team through easy sharing
 * Viral growth engine
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Twitter, Copy, Download, TrendingUp, Zap, Trophy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ViralMoment {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  type: 'massive_win' | 'epic_comeback' | 'perfect_call' | 'streak' | 'liquidation';
  title: string;
  description: string;
  pnlChange: number;
  shareUrl: string;
}

export const ViralMoments: React.FC = () => {
  const { toast } = useToast();
  const [recentMoments, setRecentMoments] = useState<ViralMoment[]>([]);
  const [showShareModal, setShowShareModal] = useState<ViralMoment | null>(null);

  useEffect(() => {
    // Subscribe to arena events to detect viral moments
    detectViralMoments();

    // Load recent moments from storage
    loadRecentMoments();
  }, []);

  const detectViralMoments = () => {
    // TODO: Connect to real arena service
    // For now, simulate with example moments
    const exampleMoments: ViralMoment[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 300000),
        agentId: 'quantum',
        agentName: 'QUANTUM-X',
        agentAvatar: '🔶',
        type: 'massive_win',
        title: "QUANTUM'S MASSIVE WIN",
        description: '+8.7% in 12 minutes on BTCUSDT',
        pnlChange: 8.7,
        shareUrl: 'https://ignitex.live/arena?moment=1'
      }
    ];

    // Check localStorage for saved moments
    try {
      const saved = localStorage.getItem('viral_moments');
      if (saved) {
        const moments = JSON.parse(saved);
        setRecentMoments(moments.slice(0, 5)); // Show last 5
      } else {
        setRecentMoments(exampleMoments);
        localStorage.setItem('viral_moments', JSON.stringify(exampleMoments));
      }
    } catch (error) {
      console.error('Error loading moments:', error);
    }
  };

  const loadRecentMoments = () => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('viral_moments');
      if (saved) {
        const moments = JSON.parse(saved);
        setRecentMoments(moments);
      }
    } catch (error) {
      console.error('Error loading moments:', error);
    }
  };

  const addViralMoment = (moment: ViralMoment) => {
    try {
      const updated = [moment, ...recentMoments].slice(0, 10); // Keep last 10
      setRecentMoments(updated);
      localStorage.setItem('viral_moments', JSON.stringify(updated));

      // Show notification
      toast({
        title: '🔥 Viral Moment Detected!',
        description: moment.title,
        duration: 5000
      });
    } catch (error) {
      console.error('Error saving moment:', error);
    }
  };

  const shareToTwitter = (moment: ViralMoment) => {
    const text = `🤖 ${moment.title}!\n\n${moment.agentAvatar} ${moment.agentName} just ${
      moment.pnlChange > 0 ? 'made' : 'lost'
    } ${Math.abs(moment.pnlChange).toFixed(1)}% ${moment.description}\n\nWatch AI agents trade live 👇`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
      moment.shareUrl
    )}&hashtags=AITrading,CryptoTrading,IgniteX`;

    window.open(url, '_blank');

    toast({
      title: '🚀 Opening Twitter',
      description: 'Thanks for sharing!',
      duration: 3000
    });
  };

  const copyShareLink = (moment: ViralMoment) => {
    navigator.clipboard.writeText(moment.shareUrl);

    toast({
      title: '📋 Link Copied!',
      description: 'Share it anywhere',
      duration: 3000
    });
  };

  const getMomentIcon = (type: string) => {
    switch (type) {
      case 'massive_win':
        return <TrendingUp className="w-4 h-4" />;
      case 'epic_comeback':
        return <Zap className="w-4 h-4" />;
      case 'perfect_call':
        return <Trophy className="w-4 h-4" />;
      default:
        return <Share2 className="w-4 h-4" />;
    }
  };

  const getMomentColor = (type: string) => {
    switch (type) {
      case 'massive_win':
        return 'bg-green-500';
      case 'epic_comeback':
        return 'bg-orange-500';
      case 'perfect_call':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="bg-white border border-gray-200 hover:border-orange-300 transition-colors shadow-sm">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-lg text-gray-900">Viral Moments</h3>
          </div>
          <Badge className="bg-orange-500 text-white px-2 py-1">
            {recentMoments.length} Today
          </Badge>
        </div>

        {/* Recent Moments */}
        {recentMoments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Share2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No viral moments yet...</p>
            <p className="text-xs">Exciting moments will appear here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMoments.map((moment) => (
              <div
                key={moment.id}
                className="bg-gradient-to-r from-gray-50 to-orange-50 p-4 rounded-lg border border-orange-200 hover:shadow-md transition-all"
              >
                {/* Moment Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{moment.agentAvatar}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={`${getMomentColor(
                            moment.type
                          )} text-white text-xs px-2 py-0.5 flex items-center gap-1`}
                        >
                          {getMomentIcon(moment.type)}
                          <span className="uppercase font-bold">{moment.type.replace('_', ' ')}</span>
                        </Badge>
                        <span className="text-xs text-gray-500">{formatTimeAgo(moment.timestamp)}</span>
                      </div>
                      <h4 className="font-bold text-gray-900">{moment.title}</h4>
                      <p className="text-sm text-gray-600">{moment.description}</p>
                    </div>
                  </div>

                  {/* P&L Badge */}
                  <div
                    className={`px-3 py-1 rounded-full text-white font-bold text-lg ${
                      moment.pnlChange > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {moment.pnlChange > 0 ? '+' : ''}
                    {moment.pnlChange.toFixed(1)}%
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => shareToTwitter(moment)}
                    size="sm"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white gap-1"
                  >
                    <Twitter className="w-4 h-4" />
                    Share on X
                  </Button>
                  <Button
                    onClick={() => copyShareLink(moment)}
                    size="sm"
                    variant="outline"
                    className="border-orange-300 hover:bg-orange-50 gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 p-4 rounded-lg border border-orange-300">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚀</div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Share the excitement!</h4>
              <p className="text-sm text-gray-700 mb-3">
                When agents make dramatic moves, share them with your network. Help us grow the Arena!
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white text-orange-600 border-orange-300">
                  +50 XP per share
                </Badge>
                <Badge variant="outline" className="bg-white text-orange-600 border-orange-300">
                  Unlock 'Evangelist' badge at 10 shares
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Share Settings */}
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600">
            ⚙️ Configure auto-share settings
          </Button>
        </div>
      </div>
    </Card>
  );
};
