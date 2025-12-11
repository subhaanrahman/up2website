import eventDinner from "@/assets/event-dinner.jpg";
import eventNewyear from "@/assets/event-newyear.jpg";
import eventBirthday from "@/assets/event-birthday.jpg";
import eventRooftop from "@/assets/event-rooftop.jpg";
import eventWedding from "@/assets/event-wedding.jpg";

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  image: string;
  attendees: number;
  capacity: number;
  category: string;
  host: {
    name: string;
    avatar: string;
  };
  guests: {
    name: string;
    avatar: string;
    status: "going" | "maybe" | "invited";
  }[];
}

export const events: Event[] = [
  {
    id: "1",
    title: "Summer Garden Dinner Party",
    description: "Join us for an unforgettable evening under the stars! We're hosting an elegant outdoor dinner party with delicious food, great wine, and amazing company. The menu features farm-to-table cuisine prepared by a local chef. Dress code is smart casual. Don't forget to bring your appetite and good vibes!",
    date: "Sat, Dec 28",
    time: "6:00 PM",
    location: "Brooklyn, NY",
    address: "245 Garden Ave, Brooklyn, NY 11201",
    image: eventDinner,
    attendees: 18,
    capacity: 24,
    category: "Dinner",
    host: {
      name: "Sarah Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
    },
    guests: [
      { name: "Alex Rivera", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex", status: "going" },
      { name: "Jordan Kim", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jordan", status: "going" },
      { name: "Taylor Swift", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=taylor", status: "maybe" },
      { name: "Morgan Lee", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=morgan", status: "going" },
      { name: "Casey Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=casey", status: "invited" },
    ]
  },
  {
    id: "2",
    title: "New Year's Eve Celebration 2025",
    description: "Ring in 2025 with style! Join us for the ultimate New Year's Eve party featuring live DJ, champagne toast at midnight, gourmet appetizers, and a stunning rooftop view of the fireworks. Dress to impress and get ready to dance the night away. Early arrival recommended!",
    date: "Tue, Dec 31",
    time: "9:00 PM",
    location: "Manhattan, NY",
    address: "789 Skyline Rooftop, Manhattan, NY 10001",
    image: eventNewyear,
    attendees: 87,
    capacity: 150,
    category: "New Year's",
    host: {
      name: "Marcus Johnson",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus"
    },
    guests: [
      { name: "Emma Watson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma", status: "going" },
      { name: "Chris Park", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=chris", status: "going" },
      { name: "Olivia Brown", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=olivia", status: "going" },
      { name: "Noah Davis", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=noah", status: "maybe" },
    ]
  },
  {
    id: "3",
    title: "Jake's 30th Birthday Bash",
    description: "Help us celebrate Jake turning the big 3-0! We're throwing a party he'll never forget with games, music, cake, and lots of surprises. Bring your dancing shoes and party spirit. Gifts are optional but smiles are mandatory!",
    date: "Fri, Jan 10",
    time: "7:30 PM",
    location: "Queens, NY",
    address: "456 Celebration Lane, Queens, NY 11375",
    image: eventBirthday,
    attendees: 34,
    capacity: 50,
    category: "Birthday",
    host: {
      name: "Lisa Martinez",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa"
    },
    guests: [
      { name: "Jake Thompson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jake", status: "going" },
      { name: "Mia Garcia", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mia", status: "going" },
      { name: "Ethan Cole", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ethan", status: "going" },
    ]
  },
  {
    id: "4",
    title: "Rooftop Sunset Cocktails",
    description: "Unwind after work with craft cocktails, gourmet snacks, and breathtaking city views. Our mixologist will be crafting signature drinks all evening. Perfect for networking or just enjoying a beautiful sunset with friends. Smart casual attire recommended.",
    date: "Sat, Jan 18",
    time: "5:00 PM",
    location: "Manhattan, NY",
    address: "123 Skyview Tower, Manhattan, NY 10016",
    image: eventRooftop,
    attendees: 42,
    capacity: 75,
    category: "Social",
    host: {
      name: "David Kim",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david"
    },
    guests: [
      { name: "Sophie Turner", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sophie", status: "going" },
      { name: "James Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james", status: "going" },
      { name: "Ava Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ava", status: "maybe" },
    ]
  },
  {
    id: "5",
    title: "Emily & Michael's Wedding Reception",
    description: "Join us in celebrating the love of Emily and Michael! An evening of dinner, dancing, and joy as we celebrate their union. Formal attire requested. Dinner and open bar provided. Let's make magical memories together!",
    date: "Sat, Feb 14",
    time: "6:00 PM",
    location: "The Hamptons, NY",
    address: "Ocean View Estate, Southampton, NY 11968",
    image: eventWedding,
    attendees: 120,
    capacity: 150,
    category: "Wedding",
    host: {
      name: "Emily & Michael",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily"
    },
    guests: [
      { name: "Robert Chen", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=robert", status: "going" },
      { name: "Grace Lee", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=grace", status: "going" },
      { name: "Daniel Brown", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=daniel", status: "going" },
    ]
  }
];

export const categories = [
  { label: "All Events", icon: "✨" },
  { label: "Birthday", icon: "🎂" },
  { label: "Dinner", icon: "🍽️" },
  { label: "Wedding", icon: "💒" },
  { label: "New Year's", icon: "🎉" },
  { label: "Social", icon: "🍸" },
];
