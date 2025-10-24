import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Shield, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface LegalDisclaimerProps {
  compact?: boolean;
  requireAcknowledgment?: boolean;
  onAcknowledge?: (acknowledged: boolean) => void;
}

export function LegalDisclaimer({ compact = false, requireAcknowledgment = false, onAcknowledge }: LegalDisclaimerProps) {
  const [expanded, setExpanded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledge = (checked: boolean) => {
    setAcknowledged(checked);
    onAcknowledge?.(checked);
  };

  if (compact) {
    return (
      <Alert className="bg-amber-500/5 border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-xs">
          <strong>Not Financial Advice:</strong> Educational analysis only. Crypto investments carry significant risk.
          Always do your own research.{' '}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-primary underline hover:no-underline"
          >
            Read full disclaimer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Important Legal Disclaimer</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <Alert className="bg-background/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">This is NOT Financial Advice</AlertTitle>
          <AlertDescription className="text-xs md:text-sm mt-2 leading-relaxed">
            All analysis, insights, and signals provided by IgniteX are for{' '}
            <strong>educational and informational purposes only</strong>. They do not constitute
            financial advice, investment recommendations, or solicitations to buy or sell any securities
            or cryptocurrencies.
          </AlertDescription>
        </Alert>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <div className="p-4 rounded-lg bg-background/50 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Key Points You Must Understand:
              </h4>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">1.</span>
                  <p>
                    <strong>No Investment Advice:</strong> IgniteX does not provide personalized investment
                    advice. Our AI-powered analysis is automated and does not consider your individual
                    financial situation, risk tolerance, or investment objectives.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">2.</span>
                  <p>
                    <strong>High Risk:</strong> Cryptocurrency investments are highly speculative and
                    carry substantial risk of loss. You may lose some or all of your invested capital.
                    Never invest more than you can afford to lose.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">3.</span>
                  <p>
                    <strong>Do Your Own Research (DYOR):</strong> Always conduct thorough independent
                    research and due diligence before making any investment decisions. Do not rely
                    solely on our analysis.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">4.</span>
                  <p>
                    <strong>Consult Professionals:</strong> Before making investment decisions, consult
                    with qualified financial advisors, tax professionals, and legal counsel who understand
                    your personal circumstances.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">5.</span>
                  <p>
                    <strong>No Guaranteed Results:</strong> Past performance and analysis do not guarantee
                    future results. Market conditions can change rapidly and unpredictably.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">6.</span>
                  <p>
                    <strong>Data Accuracy:</strong> While we strive for accuracy, we cannot guarantee
                    that all data and analysis are error-free, complete, or current. Market data may be
                    delayed or inaccurate.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">7.</span>
                  <p>
                    <strong>No Liability:</strong> IgniteX and its affiliates are not liable for any
                    investment losses or damages resulting from your use of this service or reliance
                    on our analysis.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">8.</span>
                  <p>
                    <strong>Regulatory Compliance:</strong> Cryptocurrency regulations vary by
                    jurisdiction. Ensure you comply with all applicable laws and regulations in your
                    area before trading or investing.
                  </p>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 space-y-2">
              <h4 className="font-semibold text-foreground text-sm">Cryptocurrency Risk Factors:</h4>
              <ul className="space-y-1 ml-4 list-disc text-xs">
                <li>Extreme price volatility and market manipulation</li>
                <li>Lack of regulation and investor protections</li>
                <li>Technical risks including hacks, bugs, and network failures</li>
                <li>Liquidity risks and potential inability to sell</li>
                <li>Regulatory changes that may affect value or legality</li>
                <li>Loss of private keys resulting in permanent loss of funds</li>
                <li>Exchange and custody risks</li>
                <li>Tax implications and reporting requirements</li>
              </ul>
            </div>

            {/* IgniteX Limitations */}
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
              <h4 className="font-semibold text-foreground text-sm">IgniteX Service Limitations:</h4>
              <ul className="space-y-1 ml-4 list-disc text-xs">
                <li>AI analysis may contain errors or biases</li>
                <li>Historical data patterns may not predict future performance</li>
                <li>Analysis quality depends on available data sources</li>
                <li>Market conditions can change faster than analysis updates</li>
                <li>Social sentiment data may not be representative or accurate</li>
                <li>Technical indicators can give false signals</li>
                <li>Analysis does not account for your personal situation</li>
              </ul>
            </div>
          </div>
        )}

        {/* Acknowledgment */}
        {requireAcknowledgment && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <Checkbox
                id="disclaimer-ack"
                checked={acknowledged}
                onCheckedChange={handleAcknowledge}
                className="mt-1"
              />
              <label
                htmlFor="disclaimer-ack"
                className="text-xs md:text-sm leading-relaxed cursor-pointer"
              >
                I acknowledge that I have read and understood this disclaimer. I understand that
                IgniteX provides educational information only, not financial advice. I will conduct
                my own research and consult with qualified professionals before making investment
                decisions. I accept full responsibility for my investment decisions.
              </label>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          For questions about this disclaimer, contact:{' '}
          <a href="mailto:legal@ignitexagency.com" className="text-primary hover:underline">
            legal@ignitexagency.com
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified inline disclaimer for cards
export function InlineDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`text-xs text-muted-foreground leading-relaxed ${className}`}>
      <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
      <strong>Educational Content:</strong> Not financial advice. Cryptocurrency investments are
      highly risky. Always do your own research and consult financial advisors.
    </div>
  );
}

// Banner disclaimer for page headers
export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="text-xs text-amber-500 hover:underline flex items-center gap-1 mb-4"
      >
        <AlertTriangle className="h-3 w-3" />
        Show disclaimer
      </button>
    );
  }

  return (
    <Alert className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <AlertTitle className="text-sm font-semibold mb-1">Educational Analysis Only</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            IgniteX provides AI-powered market analysis for educational purposes. This is not
            financial advice. Crypto investments carry significant risk. Always conduct your own
            research and consult with qualified financial advisors before making investment decisions.
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 p-0 flex-shrink-0"
        >
          ×
        </Button>
      </div>
    </Alert>
  );
}
