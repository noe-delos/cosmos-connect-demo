/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { generateRandomString } from "@/utils/auth";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Edit3,
  Key,
  RefreshCw,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface AuthData {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
  email: string;
  user_id: string;
}

interface CreditInfo {
  credits: number;
}

interface Organization {
  id: string;
  name: string;
  email: string;
  picture_url: string;
  slug: string;
  role: string;
  members: Array<{
    email: string;
    role: string;
  }>;
  teams?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    private: boolean;
  }>;
}

export default function Home() {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [newName, setNewName] = useState("");
  const [lastApiCall, setLastApiCall] = useState<{
    endpoint: string;
    status: "success" | "error" | "pending" | null;
    response: any;
  }>({ endpoint: "", status: null, response: null });
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);

  useEffect(() => {
    const savedAuthData = localStorage.getItem("authData");
    if (savedAuthData) {
      const parsedData = JSON.parse(savedAuthData);
      setAuthData(parsedData);
      if (parsedData.expires_in) {
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + parsedData.expires_in);
        setTokenExpiry(expiryDate);
      }
    }
    console.log("credits = ", credits);
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const state = generateRandomString(32);
      const codeVerifier = generateRandomString(32);
      const codeChallenge = codeVerifier;

      sessionStorage.setItem("state", state);
      sessionStorage.setItem("code_verifier", codeVerifier);

      const authUrl = new URL(`${process.env.NEXT_PUBLIC_OAUTH_URL}/authorize`);
      authUrl.searchParams.append(
        "client_id",
        process.env.NEXT_PUBLIC_CLIENT_ID!
      );
      authUrl.searchParams.append(
        "redirect_uri",
        process.env.NEXT_PUBLIC_REDIRECT_URI!
      );
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("state", state);
      authUrl.searchParams.append(
        "scope",
        "profile credits organizations write"
      );
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "plain");

      console.log("==>>>>", authUrl.toString());
      const popup = window.open(
        authUrl.toString(),
        "Login",
        "width=900,height=1200"
      );

      window.addEventListener("message", async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "oauth-callback") {
          const { code, state: returnedState } = event.data;

          const storedState = sessionStorage.getItem("state");
          if (returnedState !== storedState) {
            throw new Error("Invalid state parameter");
          }

          const storedCodeVerifier = sessionStorage.getItem("code_verifier");

          const response = await fetch("/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              code_verifier: storedCodeVerifier,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to exchange code for token");
          }

          const data = await response.json();
          setAuthData(data);
          const expiryDate = new Date();
          expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in);
          setTokenExpiry(expiryDate);
          localStorage.setItem("authData", JSON.stringify(data));
          popup?.close();

          sessionStorage.removeItem("state");
          sessionStorage.removeItem("code_verifier");
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      setLastApiCall({
        endpoint: "auth/token",
        status: "error",
        response: error,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthData(null);
    setCredits(null);
    setOrganizations([]);
    setLastApiCall({ endpoint: "", status: null, response: null });
    setTokenExpiry(null);
    localStorage.removeItem("authData");
  };

  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    setLastApiCall({ endpoint, status: "pending", response: null });
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData?.access_token}`,
          ...options.headers,
        },
      });
      const data = await response.json();
      setLastApiCall({
        endpoint,
        status: response.ok ? "success" : "error",
        response: data,
      });
      return { ok: response.ok, data };
    } catch (error) {
      setLastApiCall({
        endpoint,
        status: "error",
        response: error,
      });
      throw error;
    }
  };

  const fetchCredits = () => makeApiCall("/api/credits");

  const fetchOrganizations = async () => {
    const { ok, data } = await makeApiCall("/api/organizations");
    if (ok && data.organizations) {
      setOrganizations(data.organizations);
    }
  };

  const refreshToken = async () => {
    const { ok, data } = await makeApiCall("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        access_token: authData?.access_token,
        client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
      }),
    });

    if (ok && data.access_token) {
      setAuthData((prev) =>
        prev ? { ...prev, access_token: data.access_token } : null
      );
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in);
      setTokenExpiry(expiryDate);
      localStorage.setItem(
        "authData",
        JSON.stringify({
          ...authData,
          access_token: data.access_token,
        })
      );
    }
  };

  const updateName = async () => {
    const { ok } = await makeApiCall("/api/user", {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });

    if (ok) {
      setAuthData((prev) => (prev ? { ...prev, username: newName } : null));
      setNewName("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {!authData ? (
        <div className="h-screen flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg w-96">
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">
              OAuth API Test Client
            </h1>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-black text-white py-3 px-4 rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <Key className="w-5 h-5" />
              {isLoading ? "Authenticating..." : "Connect to API"}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              OAuth API Test Client
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Target API:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_OAUTH_URL}
                </code>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-50 text-red-700 py-2 px-4 rounded-lg hover:bg-red-100 transition-colors duration-200 flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Auth Info Panel */}
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-gray-900" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Authentication
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        Username
                      </span>
                      <span className="font-medium text-gray-900">
                        {authData.username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        Email
                      </span>
                      <span className="font-medium text-gray-900">
                        {authData.email}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-900">
                        User ID
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 p-1 rounded text-gray-900">
                          {authData.user_id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(authData.user_id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">
                      Access Token
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 p-1 rounded text-gray-900 break-all">
                        {authData.access_token}
                      </code>
                      <button
                        onClick={() => copyToClipboard(authData.access_token)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">
                      Token Expiry
                    </div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Clock className="w-4 h-4" />
                      <span>{tokenExpiry?.toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={refreshToken}
                      className="w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Token
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* API Actions Panel */}
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-gray-900" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    API Actions
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={fetchCredits}
                    className="bg-gray-100 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      <span>Fetch Credits</span>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <button
                    onClick={fetchOrganizations}
                    className="bg-gray-100 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      <span>Fetch Organizations</span>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="md:col-span-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new name"
                        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
                      />
                      <button
                        onClick={updateName}
                        disabled={!newName}
                        className="bg-gray-100 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Update Name
                      </button>
                    </div>
                  </div>
                </div>

                {/* Response Panel */}
                {lastApiCall.status && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <code className="text-sm bg-gray-200 px-2 py-1 rounded text-gray-900">
                            {lastApiCall.endpoint}
                          </code>
                          {lastApiCall.status === "success" && (
                            <span className="flex items-center gap-1 text-green-700">
                              <CheckCircle className="w-4 h-4" />
                              Success
                            </span>
                          )}
                          {lastApiCall.status === "error" && (
                            <span className="flex items-center gap-1 text-red-700">
                              <XCircle className="w-4 h-4" />
                              Error
                            </span>
                          )}
                          {lastApiCall.status === "pending" && (
                            <span className="flex items-center gap-1 text-yellow-700">
                              <AlertCircle className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(lastApiCall.response, null, 2)
                            )
                          }
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 overflow-x-auto bg-white">
                      <pre className="text-sm text-gray-900">
                        {JSON.stringify(lastApiCall.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Organizations Panel */}
            {organizations.length > 0 && (
              <div className="col-span-12">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <Building2 className="w-6 h-6 text-gray-900" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      Organizations
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organizations.map((org) => (
                      <div key={org.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-4">
                          {org.picture_url ? (
                            <Image
                              src={org.picture_url}
                              alt={org.name}
                              width={40}
                              height={40}
                              className="rounded-lg"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-gray-900" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {org.name}
                            </h3>
                            <p className="text-sm text-gray-600">{org.slug}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Role
                            </div>
                            <div className="font-medium text-gray-900">
                              {org.role}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Members
                            </div>
                            <div className="space-y-1 mt-1">
                              {org.members.map((member, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-900">
                                    {member.email}
                                  </span>
                                  <span className="text-gray-600">
                                    {member.role}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {org.teams && org.teams.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Teams
                              </div>
                              <div className="space-y-2 mt-1">
                                {org.teams.map((team) => (
                                  <div
                                    key={team.id}
                                    className="flex items-center gap-2"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: team.color }}
                                    />
                                    <span className="text-sm text-gray-900">
                                      {team.name}
                                    </span>
                                    {team.private && (
                                      <span
                                        className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray
                                      -700"
                                      >
                                        Private
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
