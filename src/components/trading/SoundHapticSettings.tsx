import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Smartphone } from 'lucide-react';
import { soundManager } from '@/utils/soundNotifications';
import { hapticManager } from '@/utils/hapticFeedback';

export function SoundHapticSettings() {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [hapticEnabled, setHapticEnabled] = useState(hapticManager.isEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume() * 100);

  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
    soundManager.setEnabled(checked);
  };

  const handleHapticToggle = (checked: boolean) => {
    setHapticEnabled(checked);
    hapticManager.setEnabled(checked);
    if (checked) {
      hapticManager.trigger('medium');
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    soundManager.setVolume(newVolume / 100);
  };

  const testSound = (type: 'buy' | 'sell' | 'filled' | 'alert' | 'error') => {
    soundManager.play(`order_${type}` as any);
    hapticManager.trigger('medium');
  };

  return (
    <div className="space-y-6 p-4">
      {/* Sound Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <Label htmlFor="sound-toggle" className="text-sm font-medium">
              Sound Notifications
            </Label>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        {soundEnabled && (
          <div className="space-y-3 pl-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Volume</Label>
                <span className="text-xs font-mono text-muted-foreground">{Math.round(volume)}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Test Sounds</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSound('buy')}
                  className="h-8 text-xs"
                >
                  Buy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSound('sell')}
                  className="h-8 text-xs"
                >
                  Sell
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSound('filled')}
                  className="h-8 text-xs"
                >
                  Filled
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSound('alert')}
                  className="h-8 text-xs"
                >
                  Alert
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSound('error')}
                  className="h-8 text-xs"
                >
                  Error
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Haptic Settings */}
      {hapticManager.isSupported() && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <Label htmlFor="haptic-toggle" className="text-sm font-medium">
                Haptic Feedback
              </Label>
            </div>
            <Switch
              id="haptic-toggle"
              checked={hapticEnabled}
              onCheckedChange={handleHapticToggle}
            />
          </div>

          {hapticEnabled && (
            <div className="pl-6">
              <p className="text-xs text-muted-foreground">
                Feel tactile feedback when placing orders and closing positions
              </p>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Sound and haptic feedback enhance your trading experience by providing immediate audio and tactile confirmation of your actions.
        </p>
      </div>
    </div>
  );
}
