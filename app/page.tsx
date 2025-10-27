import Link from "next/link";
export default function Home() {
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, (user) => {
  //     if (user) {
  //       // User is authenticated, redirect to advisor dashboard
  //       router.push('/advisor');
  //     } else {
  //       // User is not authenticated, redirect to signin
  //       router.push('/signin');
  //     }
  //     setLoading(false);
  //   });
  //   return () => unsubscribe();
  // }, [router]);
  return (
    <div>
      <Link
        href="/expert"
        className="mt-40 mb-4 px-4 py-3 rounded-lg shadow capitalize bg-blue-500 text-white block w-fit mx-auto cursor-pointer"
      >
        go to expert
      </Link>
      <Link
        href="/signup"
        className="px-4 py-3 rounded-lg shadow capitalize bg-blue-500 text-white block w-fit mx-auto cursor-pointer"
      >
        go to advisor
      </Link>
      {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p> */}
    </div>
  );
}
