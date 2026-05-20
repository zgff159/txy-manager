import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { useAppStore } from '../store/appStore';
import { useAccountStore } from '../store/accountStore';

const commonRegions = [
  { value: 'ap-guangzhou', label: '广州' },
  { value: 'ap-shanghai', label: '上海' },
  { value: 'ap-beijing', label: '北京' },
  { value: 'ap-chengdu', label: '成都' },
  { value: 'ap-chongqing', label: '重庆' },
  { value: 'ap-nanjing', label: '南京' },
  { value: 'ap-hongkong', label: '香港' },
  { value: 'ap-singapore', label: '新加坡' },
  { value: 'ap-tokyo', label: '东京' },
  { value: 'na-siliconvalley', label: '硅谷' },
  { value: 'eu-frankfurt', label: '法兰克福' },
];

const RegionSelector: React.FC = () => {
  const { selectedRegion, setSelectedRegion } = useAppStore();
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const [regions, setRegions] = useState(commonRegions);

  useEffect(() => {
    if (!currentAccountId) return;
    window.api.cvm.describeRegions(currentAccountId).then((list) => {
      if (list && list.length > 0) {
        setRegions(
          list
            .filter((r: any) => r.regionState === 'AVAILABLE')
            .map((r: any) => ({
              value: r.region,
              label: r.regionName,
            }))
        );
      }
    }).catch(() => {
      // fallback to common regions
    });
  }, [currentAccountId]);

  return (
    <Select
      value={selectedRegion}
      onChange={setSelectedRegion}
      style={{ width: 180 }}
      options={regions}
      placeholder="选择地域"
    />
  );
};

export default RegionSelector;
