'use client';

import { useState } from 'react';
import apiService from '@/lib/api';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firmaAdi: '',
    iletisimKisisi: '',
    email: '',
    mesaj: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await apiService.contact.submit(formData);
      
      if (response.success) {
        setMessageType('success');
        setMessage(response.message || 'İletişim formunuz başarıyla gönderildi!');
        
        // Reset form
        setFormData({
          firmaAdi: '',
          iletisimKisisi: '',
          email: '',
          mesaj: ''
        });
      } else {
        setMessageType('error');
        setMessage(response.error?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          messageType === 'success' 
            ? 'bg-green-500/20 border border-green-400/30 text-green-100' 
            : 'bg-red-500/20 border border-red-400/30 text-red-100'
        }`}>
          <div className="flex items-center space-x-2">
            <i className={`${
              messageType === 'success' 
                ? 'ri-check-line text-green-300' 
                : 'ri-error-warning-line text-red-300'
            }`}></i>
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* Firma Adı */}
      <div>
        <input
          type="text"
          name="firmaAdi"
          placeholder="Firma Adı"
          value={formData.firmaAdi}
          onChange={handleChange}
          required
          disabled={loading}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
        />
      </div>

      {/* İletişim Kişisi ve Email */}
      <div className="grid md:grid-cols-2 gap-4">
        <input
          type="text"
          name="iletisimKisisi"
          placeholder="İletişim Kişisi"
          value={formData.iletisimKisisi}
          onChange={handleChange}
          required
          disabled={loading}
          className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
        />
        <input
          type="email"
          name="email"
          placeholder="E-posta Adresi"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={loading}
          className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Mesaj */}
      <div>
        <textarea
          name="mesaj"
          placeholder="Mesajınız"
          rows={4}
          value={formData.mesaj}
          onChange={handleChange}
          required
          disabled={loading}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
        ></textarea>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !formData.firmaAdi || !formData.iletisimKisisi || !formData.email || !formData.mesaj}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Gönderiliyor...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <i className="ri-send-plane-line"></i>
            <span>Gönder</span>
          </div>
        )}
      </button>

      {/* Privacy Notice */}
      <div className="text-xs text-gray-400 text-center">
        <p>
          Bu form aracılığıyla gönderdiğiniz bilgiler, size daha iyi hizmet verebilmek amacıyla kullanılacaktır. 
          <a href="#" className="text-blue-300 hover:text-blue-200 underline ml-1">
            Gizlilik Politikamızı
          </a> 
          inceleyebilirsiniz.
        </p>
      </div>
    </form>
  );
}
