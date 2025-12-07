"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import UserCard from "@/app/components/admin/UserCard";
import { User } from "@/types/user";
import { Users, Wallet, Gift, TrendingUp } from "lucide-react";

export default function Analysis() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
        })) as User[];
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Calculate stats
  const totalWalletBalance = users.reduce((sum, user) => sum + (user.walletBalance || 0), 0);
  const claimedFreeCash = users.filter((user) => user.hasClaimedFreeCash).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            User Dashboard
          </h1>
          <p className="text-gray-500 mt-2">Manage and monitor all registered users</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Users */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Active</span>
            </div>
          </div>

          {/* Total Wallet Balance */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Balance</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">₹{totalWalletBalance.toLocaleString()}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Wallet className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">Across all wallets</span>
            </div>
          </div>

          {/* Claimed Free Cash */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Free Cash Claimed</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{claimedFreeCash}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Gift className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all" 
                  style={{ width: `${users.length > 0 ? (claimedFreeCash / users.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {users.length > 0 ? Math.round((claimedFreeCash / users.length) * 100) : 0}% of users
              </span>
            </div>
          </div>

          {/* Average Balance */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Balance</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  ₹{users.length > 0 ? Math.round(totalWalletBalance / users.length).toLocaleString() : 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">Per user average</span>
            </div>
          </div>
        </div>

        {/* Users Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">All Users</h2>
          <p className="text-gray-500 text-sm">Showing {users.length} registered users</p>
        </div>

        {/* Users List */}
        <div className="flex flex-col gap-4">
          {users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700">No users found</h3>
            <p className="text-gray-500 mt-1">Users will appear here once they register</p>
          </div>
        )}
      </div>
    </div>
  );
}