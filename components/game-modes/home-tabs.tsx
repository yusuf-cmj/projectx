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
import { Gamepad, Users, Copy, Loader2 } from "lucide-react"
import { useState } from "react"
import SingleplayerHistory from "@/components/SingleplayerHistory" // ✅ import et
// Add Firebase imports
import { db } from '@/lib/firebase'; // Adjust path if needed
import { ref, set, serverTimestamp, get } from 'firebase/database';
import { useSession } from 'next-auth/react'; // Import useSession
// import { useAuth } from '@/context/AuthContext'; // Assuming you have an AuthContext
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface GameHistoryItem {
  id: number;
  score: number;
  playedAt: string;
  mode: string; // Singleplayer veya Multiplayer
}

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
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [isDifficultyDialogOpen, setIsDifficultyDialogOpen] = useState(false);
  const router = useRouter() // ✅ EKLENDİ: Yönlendirme için
  const [showHistory, setShowHistory] = useState(false)
  const { data: session, status } = useSession(); // Get session status
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  // const { user } = useAuth(); // Get current user if available

  // State for Dialogs and Loading
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreateInfoDialogOpen, setIsCreateInfoDialogOpen] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Define the function to handle room creation
  const handleCreateRoom = async () => {
    if (status === 'loading' || isCreating) return;
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

    setIsCreating(true);
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
      setCreatedRoomCode(roomCode); // Store code to show in dialog
      setIsCreateInfoDialogOpen(true); // Open info dialog
      // No automatic navigation here, user closes dialog
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Function to open the join dialog
  const triggerJoinRoomDialog = () => {
    if (!session || !session.user) {
      console.error("User not logged in");
      alert("You must be logged in to join a room.");
      return;
    }
    setJoinRoomCodeInput(""); // Clear previous input
    setIsJoinDialogOpen(true);
  };

  // Function to handle the actual joining process (called from dialog)
  const submitJoinRoom = async (code: string) => {
    if (status === 'loading' || isJoining || !code) return;
    if (!session || !session.user) {
      console.error("User not logged in");
      alert("You must be logged in to join a room.");
      return;
    }

    setIsJoining(true);
    const userId = session.user.id;
    const userName = session.user.name ?? session.user.email ?? 'Anonymous';
    const upperCode = code.trim().toUpperCase();
    const roomRef = ref(db, `rooms/${upperCode}`);

    try {
      const snapshot = await get(roomRef);

      if (snapshot.exists()) {
        // Room exists, add the player
        const roomData = snapshot.val();
        if (roomData.players && roomData.players[userId]) {
           toast.info("You are already in this room!");
           setIsJoinDialogOpen(false);
           router.push(`/multiplayer/lobby/${upperCode}`);
           return;
        }
        // Add or update player data using set to ensure all fields are present
        const playerRef = ref(db, `rooms/${upperCode}/players/${userId}`);
        await set(playerRef, {
          name: userName,
          score: 0,
          isReady: false,
        });

        console.log(`User ${userId} joined room ${upperCode}`);
        setIsJoinDialogOpen(false); // Close dialog on success
        router.push(`/multiplayer/lobby/${upperCode}`);
      } else {
        // Room does not exist
        toast.error(`Room with code "${upperCode}" not found.`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room. Please check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // --- Copy Room Code Logic ---
  const copyToClipboard = (text: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success("Room code copied!");
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast.error("Failed to copy code.");
      });
  };

  return (
    <div>
      {!showHistory && (
  <Tabs defaultValue="singleplayer" className="w-full max-w-md mx-auto">
{showHistory && (
  <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 p-6">
    <div className="max-w-2xl mx-auto">
      <div className="bg-purple-800/30 backdrop-blur-sm p-6 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20">
        <h2 className="text-2xl font-bold mb-6 text-white tracking-wide flex items-center gap-2">
          🎮 Game History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-purple-400/20">
                <th className="p-3 text-purple-200 font-semibold">Date</th>
                <th className="p-3 text-purple-200 font-semibold">Game</th>
                <th className="p-3 text-purple-200 font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-purple-400/10 hover:bg-purple-700/20 transition-colors">
                  <td className="p-3 text-white">{new Date(item.playedAt).toLocaleString()}</td>
                  <td className="p-3 text-white">
  {item.mode?.toLowerCase() === "multiplayer" ? "Multiplayer Mode" : "Singleplayer Mode"}
</td>
                  <td className="p-3 text-white">{item.score} points</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-center mt-6">
          <Button variant="secondary" onClick={() => setShowHistory(false)}>⬅ Back</Button>
        </div>
      </div>
    </div>
  </div>
)}

  </Tabs>
)}
      <Tabs defaultValue="singleplayer" className="w-full max-w-md mx-auto">
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
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Gamepad className="h-5 w-5" />
                  Singleplayer Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 py-3">
                <div>
                  <p className="text-xs text-purple-200 mb-1.5">
                    Play a solo quiz with random quotes from movies and games.
                  </p>
                  <Button
                    variant="default"
                    size="default"
                    className="w-full"
                    onClick={() => setIsDifficultyDialogOpen(true)}
                    >
                      Play
                        </Button>

                </div>
                <div>
                  <p className="text-xs text-purple-200 mb-1.5">
                    Check your game history and scores.
                  </p>
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full"
                    onClick={async () => {
                      const res = await fetch("/api/game-history");
                      const data = await res.json();
                      setHistory(data);
                      setShowHistory(true);
                    }}
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
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                Multiplayer Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 py-3">
              <div>
                <p className="text-xs text-purple-200 mb-1.5">
                  Join a room and compete with others.
                </p>
                <Button
                  variant="default"
                  size="default"
                  className="w-full"
                  onClick={triggerJoinRoomDialog}
                >
                  Join
                </Button>
              </div>
              <div>
                <p className="text-xs text-purple-200 mb-1.5">
                  Create a custom room to play with friends.
                </p>
                <Button
                  variant="outline"
                  size="default"
                  className="w-full"
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                >
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Join Room Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-purple-900/80 backdrop-blur-md border-purple-400/30 text-white">
          <DialogHeader>
            <DialogTitle>Join Multiplayer Room</DialogTitle>
            <DialogDescription className="text-purple-200">
              Enter the 6-character room code shared by the host.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="room-code" className="text-right text-purple-200">
                Code
              </Label>
              <Input 
                id="room-code"
                value={joinRoomCodeInput}
                onChange={(e) => setJoinRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="col-span-3 bg-purple-800/50 border-purple-400/40 focus:border-purple-400 focus:ring-purple-400"
                placeholder="ABCDEF"
                autoCapitalize="characters"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
               <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button 
               type="button" 
               onClick={() => submitJoinRoom(joinRoomCodeInput)} 
               disabled={isJoining || joinRoomCodeInput.length !== 6}
            >
              {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isJoining ? "Joining..." : "Join Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Create Room Info Dialog */}
       <Dialog open={isCreateInfoDialogOpen} onOpenChange={setIsCreateInfoDialogOpen}>
        <DialogContent className="sm:max-w-md bg-purple-900/80 backdrop-blur-md border-purple-400/30 text-white">
          <DialogHeader>
            <DialogTitle>Room Created!</DialogTitle>
            <DialogDescription className="text-purple-200">
              Share this code with your friends so they can join.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Room Code
              </Label>
              <Input
                id="link"
                defaultValue={createdRoomCode ?? ""}
                readOnly
                className="h-12 text-2xl font-mono tracking-widest text-center bg-purple-800/50 border-purple-400/40"
              />
            </div>
            <Button type="button" size="icon" className="px-3 h-12" onClick={() => copyToClipboard(createdRoomCode)}>
              <span className="sr-only">Copy</span>
              <Copy className="h-5 w-5" />
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => router.push(`/multiplayer/lobby/${createdRoomCode}`)}>
                Go to Lobby
              </Button>
            </DialogClose>
             <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDifficultyDialogOpen} onOpenChange={setIsDifficultyDialogOpen}>
  <DialogContent className="sm:max-w-sm bg-purple-900/80 backdrop-blur-md border-purple-400/30 text-white">
    <DialogHeader>
      <DialogTitle>Select Difficulty</DialogTitle>
      <DialogDescription className="text-purple-200">
        Choose a difficulty level before starting the game.
      </DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-3 py-4">
      {(['easy', 'medium', 'hard'] as const).map((level) => (
        <Button
          key={level}
          variant={selectedDifficulty === level ? "default" : "outline"}
          onClick={() => setSelectedDifficulty(level)}
          className={`capitalize w-full ${selectedDifficulty === level ? 'ring-2 ring-purple-400' : ''}`}
        >
          {level}
        </Button>
      ))}
    </div>
    <DialogFooter className="mt-2">
      <Button
        onClick={() => {
          router.push(`/singleplayer/play?difficulty=${selectedDifficulty}`);
        }}
        className="w-full"
      >
        Start Game
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


    </div>
  )
}
