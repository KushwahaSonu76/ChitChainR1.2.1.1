import { useState, useEffect } from 'react';
import { useWallet } from '../lib/wallet/WalletContext';
import { Link } from 'react-router-dom';
import { getMemberChits } from '../lib/contract/soroban';

const Dashboard = () => {
  const { address } = useWallet();
  const [chits, setChits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showTour, setShowTour] = useState(() => {
    return localStorage.getItem('hasSeenTour') !== 'true';
  });

  const dismissTour = () => {
    localStorage.setItem('hasSeenTour', 'true');
    setShowTour(false);
  };

  useEffect(() => {
    if (address) {
      setLoading(true);
      getMemberChits(address)
        .then(res => {
          setChits(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Please connect your wallet</h2>
        <p className="text-gray-600 mt-2">You need to connect your Freighter wallet to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {showTour && (
        <div className="bg-white p-6 rounded-xl border-2 border-accent shadow-lg mb-8 relative">
          <button 
            onClick={dismissTour}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold text-stellar mb-2">👋 Welcome to ChitChain!</h2>
          <p className="text-gray-600 mb-4">You're connected and ready to go. Here is how it works:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="font-bold text-accent">1. Get Testnet XLM</span>
              <p className="text-sm text-gray-500 mt-1">Make sure you have Testnet XLM in your Freighter wallet to pay for contributions and fees.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="font-bold text-accent">2. Join or Create</span>
              <p className="text-sm text-gray-500 mt-1">Create a new Chit Group or ask a friend for a link to join theirs.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="font-bold text-accent">3. Contribute</span>
              <p className="text-sm text-gray-500 mt-1">Contribute your share each round and get disbursed when it's your turn!</p>
            </div>
          </div>
          <button 
            onClick={dismissTour}
            className="bg-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-accent/90"
          >
            Got it, let's start!
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-stellar">My Chit Groups</h1>
        <Link to="/create" className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Create New Group
        </Link>
      </div>

      {chits.length > 0 && (
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Groups
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed Groups
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded w-full mt-4"></div>
            </div>
          ))}
        </div>
      ) : chits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chits.filter(chit => {
            const isCompleted = chit.current_round >= chit.total_rounds;
            return activeTab === 'active' ? !isCompleted : isCompleted;
          }).map(chit => (
            <div key={chit.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-stellar">Group #{chit.id}</h3>
                <span className={
                  chit.current_round >= chit.total_rounds
                    ? "bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-semibold"
                    : "bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold"
                }>
                  {chit.current_round >= chit.total_rounds ? 'Completed' : 'Active'}
                </span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monthly Contribution:</span>
                  <span className="font-medium text-gray-900">{chit.contribution_amount / 10000000} XLM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress:</span>
                  <span className="font-medium text-gray-900">Round {chit.current_round} of {chit.total_rounds}</span>
                </div>
              </div>
              <Link to={`/chit/${chit.id}`} className="w-full block text-center bg-gray-50 hover:bg-gray-100 text-stellar font-medium py-2 rounded-lg transition-colors border border-gray-200">
                View Details
              </Link>
            </div>
          ))}
          {chits.filter(chit => {
            const isCompleted = chit.current_round >= chit.total_rounds;
            return activeTab === 'active' ? !isCompleted : isCompleted;
          }).length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-500">
              No {activeTab} groups found.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl border border-gray-100 text-center space-y-4 flex flex-col items-center">
          <div className="bg-gray-50 p-4 rounded-full mb-2">
            <span className="text-4xl">📭</span>
          </div>
          <h3 className="text-xl font-medium text-gray-900">No groups</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-2">You aren't a member of any Chit Groups yet. Create a new one or ask a friend for an invite link.</p>
          <div className="flex space-x-4 mt-2">
            <Link to="/create" className="bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
              Create First Group
            </Link>
            <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noopener noreferrer" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center">
              Get Testnet XLM
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
