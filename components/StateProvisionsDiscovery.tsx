"use client";

import { useState } from "react";
import {
  MapPin,
  ArrowRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  X,
} from "lucide-react";

// US States and territories with display names
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
  { code: "PR", name: "Puerto Rico" },
  { code: "GU", name: "Guam" },
  { code: "VI", name: "U.S. Virgin Islands" },
  { code: "AS", name: "American Samoa" },
  { code: "MP", name: "Northern Mariana Islands" },
];

interface StateProvision {
  id: string;
  text: string;
  section?: string;
  excerpt: string;
  relevanceScore: number;
  semanticScore: number;
  keywordScore: number;
  chatPrompt: string;
  friendlyTitle?: string;
  friendlyDescription?: string;
}

interface StateProvisionsResponse {
  state: string;
  stateName: string;
  provisions: StateProvision[];
  totalFound: number;
  processingTime: number;
}

interface StateProvisionsDiscoveryProps {
  onStartChat: (prompt: string) => void;
}

export default function StateProvisionsDiscovery({
  onStartChat,
}: StateProvisionsDiscoveryProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [provisions, setProvisions] = useState<StateProvisionsResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
    setProvisions(null);
    setShowModal(false);
    setError(null);
  };

  const fetchStateProvisions = async () => {
    if (!selectedState) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/state-provisions/${selectedState}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch state provisions");
      }

      const data: StateProvisionsResponse = await response.json();
      setProvisions(data);
      setShowModal(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setProvisions(null);
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatClick = (provision: StateProvision) => {
    setShowModal(false);
    onStartChat(provision.chatPrompt);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const selectedStateData = US_STATES.find((s) => s.code === selectedState);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Compact Header and State Selection */}
      <div className="bg-yellow-light border border-yellow rounded-lg p-6 h-full flex flex-col">
        <h2 className="text-xl font-bold text-black mb-3 flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>HR1 Provisions by State</span>
        </h2>
        <p className="text-gray-700 mb-4 text-sm leading-relaxed flex-grow">
          Find the top provisions in HR1 impact your state, as explicity called
          out in the bill.
        </p>

        {/* State Selection */}
        <div className="bg-white rounded-lg p-4 shadow-sm mt-auto">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="state-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Your State
              </label>
              <select
                id="state-select"
                value={selectedState}
                onChange={handleStateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow focus:border-yellow text-black text-sm"
              >
                <option value="">Choose a state...</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchStateProvisions}
              disabled={!selectedState || isLoading}
              className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium text-sm transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>Find Provisions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Modal for Provisions Display */}
      {showModal && provisions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-black">
                  Top HR1 Provisions for {provisions.stateName}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span>{provisions.provisions.length} provisions found</span>
                  <span>•</span>
                  <span>{provisions.processingTime}ms processing time</span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Provisions List */}
              <div className="divide-y divide-gray-200">
                {provisions.provisions.length > 0 ? (
                  provisions.provisions.map((provision, index) => (
                    <div
                      key={provision.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      {/* Provision Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-yellow rounded-full flex items-center justify-center">
                          <span className="text-black text-sm font-bold">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-black">
                            {provision.friendlyTitle ||
                              provision.section ||
                              "HR1 Provision"}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <span>
                              Relevance:{" "}
                              {Math.round(provision.relevanceScore * 100)}%
                            </span>
                            <span>•</span>
                            <span>ID: {provision.id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Provision Description */}
                      <p className="text-gray-800 leading-relaxed mb-4">
                        {provision.friendlyDescription || provision.excerpt}
                      </p>

                      {/* Dig Into Details Button */}
                      <button
                        onClick={() => handleChatClick(provision)}
                        className="w-full px-4 py-2 bg-yellow text-black rounded-lg hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                      >
                        <span>Dig into details</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-gray-500 mb-2">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No specific provisions found for {provisions.stateName}
                    </h4>
                    <p className="text-gray-600">
                      This could mean HR1 provisions affect all states equally,
                      or try searching for broader topics in the main chat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helper Text */}
      {!showModal && !isLoading && (
        <div className="text-center text-gray-600 mt-4">
          <p className="text-xs">
            Note: This tool only highlights provisions whereby a state is named
            explicitly in the bill. It does not highlight inferred impacts of
            the bill on a given state. For example, if a provision indicates
            defense spending but doesn't call out a specific state(s) it will
            not highlight states even if they have a high concentration of
            military bases or defense contractors.
          </p>
        </div>
      )}
    </div>
  );
}
