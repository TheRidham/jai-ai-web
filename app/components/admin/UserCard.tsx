"use client";

import { User } from "@/types/user";
import { User as UserIcon, Phone, Mail, Wallet, Gift, Calendar, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserCardProps {
  user: User;
}

export default function UserCard({ user }: UserCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/admin/users/${user.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group cursor-pointer"
    >
      <div className="flex items-center gap-5">
        {/* User Avatar */}
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/40 transition-shadow">
            <UserIcon className="w-7 h-7" />
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${user.hasClaimedFreeCash ? "bg-green-400" : "bg-gray-300"}`} />
        </div>

        {/* User Details */}
        <div className="flex-1 min-w-0">
          {/* Name Row */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-gray-900 text-lg truncate">
              {user.name || "Unknown"}
            </h3>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
              {user.gender || "Unknown"}
            </span>
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              {user.age ? `${user.age} yrs` : "Unknown"}
            </span>
          </div>

          {/* Info Grid */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {/* Email */}
            <div className="flex items-center gap-2 text-gray-500">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate max-w-[200px]">{user.email || "Unknown"}</span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2 text-gray-500">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{user.phone || "Unknown"}</span>
            </div>

            {/* Join Date */}
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{user.createdAt?.toLocaleDateString() || "Unknown"}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Wallet & Status */}
        <div className="flex items-center gap-4">
          {/* Free Cash Badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${user.hasClaimedFreeCash ? "bg-green-50" : "bg-gray-50"}`}>
            <Gift className={`w-4 h-4 ${user.hasClaimedFreeCash ? "text-green-500" : "text-gray-400"}`} />
            <span className={`text-sm font-medium ${user.hasClaimedFreeCash ? "text-green-600" : "text-gray-500"}`}>
              {user.hasClaimedFreeCash ? "Claimed" : "Unclaimed"}
            </span>
          </div>

          {/* Wallet Balance */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5 rounded-xl border border-green-100">
            <Wallet className="w-5 h-5 text-green-600" />
            <div className="flex flex-col">
              <span className="text-xs text-green-600/70 font-medium">Balance</span>
              <span className="text-green-700 font-bold text-lg leading-tight">
                ₹{user.walletBalance?.toLocaleString() ?? "0"}
              </span>
            </div>
          </div>

          {/* Arrow indicator */}
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}
