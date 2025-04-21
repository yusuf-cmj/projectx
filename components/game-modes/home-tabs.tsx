"use client"

import { useRouter } from "next/navigation" // ✅ EKLENDİ
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Gamepad, Users } from "lucide-react"
import { useState } from "react"
import SingleplayerHistory from "@/components/SingleplayerHistory" // ✅ import et
// Add Firebase imports
import { db } from '@/lib/firebase'; // Adjust path if needed
import { ref, set, serverTimestamp, get } from 'firebase/database';
import { useSession } from 'next-auth/react'; // Import useSession
// import { useAuth } from '@/context/AuthContext'; // Assuming you have an AuthContext

// Function to generate a simple random room code
function generateRoomCode(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export default function HomeTabs() {
  const router = useRouter() // ✅ EKLENDİ: Yönlendirme için
  const [showHistory, setShowHistory] = useState(false)
  const { data: session, status } = useSession(); // Get session status
  // const { user } = useAuth(); // Get current user if available

  // Define the function to handle room creation
  const handleCreateRoom = async () => {
    if (status === 'loading') return; // Don't do anything if session is loading
    if (!session || !session.user) { // Check if user is logged in
      console.error("User not logged in");
      alert("You must be logged in to create a room.");
      // Optionally redirect to login page: router.push('/login');
      return;
    }

    // Use optional chaining for user properties
    const userId = session.user.id; // Adjust if your session user id is different
    const userName = session.user.name ?? session.user.email ?? 'Anonymous'; // Use name, fallback to email, then Anonymous

    if (!userId) {
      console.error("User ID is missing from session");
      alert("An error occurred retrieving your user ID. Please try again.");
      return;
    }

    const roomCode = generateRoomCode();
    const roomRef = ref(db, `rooms/${roomCode}`);

    try {
      // Room limit check (optional)
      // ...

      await set(roomRef, {
        creatorId: userId, // Store the creator's ID
        createdAt: serverTimestamp(),
        status: 'waiting',
        players: {
          [userId]: { // Add creator as the first player using their ID as key
            name: userName,
            score: 0,
            isReady: false, // Creator starts as not ready
          }
        },
      });
      console.log(`Room created with code: ${roomCode} by user ${userId}`);
      alert(`Room created! Code: ${roomCode}. Share this code with others.`);
      router.push(`/multiplayer/lobby/${roomCode}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    }
  };

  // Function to handle joining a room
  const handleJoinRoom = async () => {
    if (status === 'loading') return;
    if (!session || !session.user) {
      console.error("User not logged in");
      alert("You must be logged in to join a room.");
      return;
    }

    const userId = session.user.id;
    const userName = session.user.name ?? session.user.email ?? 'Anonymous';

    if (!userId) {
      console.error("User ID is missing from session");
      alert("An error occurred retrieving your user ID. Please try again.");
      return;
    }

    const code = prompt("Enter the room code:")?.trim().toUpperCase(); // Get code, trim whitespace, make uppercase

    if (!code) return; // User cancelled or entered empty code

    const roomRef = ref(db, `rooms/${code}`);

    try {
      const snapshot = await get(roomRef);

      if (snapshot.exists()) {
        // Room exists, add the player
        const roomData = snapshot.val();
        if (roomData.players && roomData.players[userId]) {
           alert("You are already in this room!"); // Optional: Check if already joined
           router.push(`/multiplayer/lobby/${code}`);
           return;
        }
        // Add or update player data using set to ensure all fields are present
        const playerRef = ref(db, `rooms/${code}/players/${userId}`);
        await set(playerRef, {
          name: userName,
          score: 0,
          isReady: false,
        });

        console.log(`User ${userId} joined room ${code}`);
        router.push(`/multiplayer/lobby/${code}`);
      } else {
        // Room does not exist
        alert(`Room with code "${code}" not found.`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please check the code and try again.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900">
      <Tabs defaultValue="singleplayer" className="w-full max-w-md mx-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="singleplayer">
            <Gamepad className="mr-2 h-4 w-4" /> Singleplayer
          </TabsTrigger>
          <TabsTrigger value="multiplayer">
            <Users className="mr-2 h-4 w-4" /> Multiplayer
          </TabsTrigger>
        </TabsList>

        {/* SINGLEPLAYER TAB */}
        <TabsContent value="singleplayer">
          {showHistory ? (
            <>
              <SingleplayerHistory />
              <div className="text-center mt-4">
                <Button variant="secondary" onClick={() => setShowHistory(false)}>
                  ⬅ Back
                </Button>
              </div>
            </>
          ) : (
            <Card className="hover:shadow-xl transition duration-300 bg-purple-800/30 backdrop-blur-sm border-purple-400/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Gamepad className="h-5 w-5" />
                  Singleplayer Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-purple-200 mb-1">
                    Play a solo quiz with random quotes from movies and games.
                  </p>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push("/singleplayer/play")}
                  >
                    Play
                  </Button>
                </div>
                <div>
                  <p className="text-sm text-purple-200 mb-1">
                    Check your game history and scores.
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => setShowHistory(true)}
                  >
                    History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* MULTIPLAYER TAB */}
        <TabsContent value="multiplayer">
          <Card className="hover:shadow-xl transition duration-300 bg-purple-800/30 backdrop-blur-sm border-purple-400/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                Multiplayer Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-purple-200 mb-1">
                  Join a room and compete with others.
                </p>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full"
                  onClick={handleJoinRoom}
                >
                  Join
                </Button>
              </div>
              <div>
                <p className="text-sm text-purple-200 mb-1">
                  Create a custom room to play with friends.
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleCreateRoom}
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
