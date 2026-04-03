"use client";

import { useEffect, useState } from "react";
import { useSite } from "@/lib/site-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FlaskConical, Trophy } from "lucide-react";
import { toast } from "sonner";

type Variant = {
  id: string;
  label: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
  isWinner: boolean;
  rankingData?: {
    position: number;
    clicks: number;
    impressions: number;
  };
};

type ABTest = {
  id: string;
  articleTitle: string;
  articleId: string;
  keyword: string;
  status: string;
  variants: Variant[];
  createdAt: string;
  completedAt: string | null;
};

export default function ABTestsPage() {
  const { currentSite } = useSite();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickWinnerTestId, setPickWinnerTestId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentSite) return;
    async function fetchTests() {
      try {
        const res = await fetch(`/api/ab-tests?siteId=${currentSite!.id}`);
        if (res.ok) {
          setTests(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch A/B tests:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, [currentSite]);

  async function handlePickWinner(testId: string) {
    if (!selectedVariant) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ab-tests/${testId}/pick-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariant }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTests((prev) => prev.map((t) => (t.id === testId ? updated : t)));
        setPickWinnerTestId(null);
        setSelectedVariant("");
        toast.success("Winner selected successfully");
      } else {
        toast.error("Failed to pick winner");
      }
    } catch (err) {
      console.error("Failed to pick winner:", err);
      toast.error("Failed to pick winner");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">A/B Tests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Test different meta tags to find what ranks best
        </p>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FlaskConical className="size-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">No A/B tests yet</p>
            <p className="mt-1 text-sm text-gray-500">
              A/B tests will be created automatically when optimizations suggest meta tag changes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{test.articleTitle}</CardTitle>
                    <CardDescription className="mt-1">
                      Keyword: {test.keyword}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      test.status === "running"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-green-500/20 text-green-400 border-green-500/30"
                    }
                  >
                    {test.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {test.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`rounded-lg border p-3 ${
                      variant.isActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    } ${variant.isWinner ? "ring-2 ring-yellow-500/50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{variant.label}</span>
                        {variant.isActive && (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                        {variant.isWinner && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            <Trophy className="mr-1 size-3" />
                            Winner
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{variant.metaTitle}</p>
                    <p className="text-xs text-gray-500">{variant.metaDescription}</p>
                    {variant.rankingData && (
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>Pos: {variant.rankingData.position}</span>
                        <span>Clicks: {variant.rankingData.clicks}</span>
                        <span>Impressions: {variant.rankingData.impressions}</span>
                      </div>
                    )}
                  </div>
                ))}

                {test.status === "running" && (
                  <Dialog
                    open={pickWinnerTestId === test.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setPickWinnerTestId(null);
                        setSelectedVariant("");
                      }
                    }}
                  >
                    <DialogTrigger >
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setPickWinnerTestId(test.id)}
                      >
                        <Trophy className="mr-2 size-4" />
                        Pick Winner
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Pick Winner</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Select Winning Variant</Label>
                          <Select
                            value={selectedVariant}
                            onValueChange={(val) => val && setSelectedVariant(val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a variant" />
                            </SelectTrigger>
                            <SelectContent>
                              {test.variants.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.label} - {v.metaTitle}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handlePickWinner(test.id)}
                          disabled={!selectedVariant || submitting}
                        >
                          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                          Confirm Winner
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <p className="text-xs text-gray-500">
                  Created: {new Date(test.createdAt).toLocaleDateString()}
                  {test.completedAt && ` | Completed: ${new Date(test.completedAt).toLocaleDateString()}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
