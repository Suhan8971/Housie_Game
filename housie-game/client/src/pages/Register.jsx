import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
    const [otp, setOtp] = useState({ email: '', phone: '' });
    const [step, setStep] = useState(1); // 1: Register, 2: OTP
    const [error, setError] = useState('');
    const { register, verifyOtp, resendOtp } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await register(formData);
            if (data.emailOtp && data.phoneOtp) {
                console.log(`[DEV MODE] Email OTP: ${data.emailOtp}`);
                console.log(`[DEV MODE] Phone OTP: ${data.phoneOtp}`);
                // alert('OTPs sent! Check the Console (F12) or Server Terminal.'); // Removed alert for cleaner UX
            }
            setStep(2);
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Registration failed';
            setError(errorMsg);
            if (errorMsg === 'User already exists') {
                setStep(2); // Move to OTP step
            }
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await verifyOtp(formData.email, otp.email, otp.phone);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTPs');
        }
    };

    const handleResendOtp = async () => {
        try {
            await resendOtp(formData.email);
            // alert(`OTPs resent to ${formData.email}. Check Server Console.`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend OTP');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center mb-6 text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    {step === 1 ? 'Create Account' : 'Verify OTP'}
                </h2>

                {error && <p className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center">{error}</p>}

                {step === 1 ? (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-gray-300 text-sm font-medium">Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Full Name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-300 text-sm font-medium">Email</label>
                            <input name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Email Address" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-300 text-sm font-medium">Phone</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} required className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Phone Number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-300 text-sm font-medium">Password</label>
                            <input name="password" type="password" value={formData.password} onChange={handleChange} required className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Create Password" />
                        </div>
                        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg">
                            Get OTP
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-4">
                        <p className="text-gray-300 text-sm text-center mb-4">
                            OTPs sent to <b>{formData.email}</b> and <b>{formData.phone}</b>
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-gray-300 text-sm font-medium">Email OTP</label>
                                <input
                                    value={otp.email}
                                    onChange={(e) => setOtp({ ...otp, email: e.target.value })}
                                    placeholder="XXXX"
                                    required
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-center font-mono letter-spacing-2"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-300 text-sm font-medium">Phone OTP</label>
                                <input
                                    value={otp.phone}
                                    onChange={(e) => setOtp({ ...otp, phone: e.target.value })}
                                    placeholder="XXXX"
                                    required
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-center font-mono letter-spacing-2"
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg">
                            Verify & Create Account
                        </button>

                        <button
                            type="button"
                            onClick={handleResendOtp}
                            className="w-full text-blue-400 hover:text-blue-300 text-sm underline mt-2"
                        >
                            Resend OTPs
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-gray-400 text-sm">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
