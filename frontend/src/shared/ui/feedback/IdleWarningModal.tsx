import { Modal, Button, Progress } from 'antd'

interface IdleWarningModalProps {
    open: boolean;
    secondsLeft: number;
    totalSeconds: number;
    onStay: () => void;
    onLogout: () => void;
}

export function IdleWarningModal({ 
    open, 
    secondsLeft, 
    totalSeconds, 
    onStay, 
    onLogout }: IdleWarningModalProps) {
        const percent = Math.round(((totalSeconds - secondsLeft) / totalSeconds) *100)
        return (
            <Modal
                open={open}
                title = "即将自动登出 / Auto sign-out"
                closable = {false}
                maskClosable = {false}
                keyboard = {false}
                footer={[
                    <Button key="logout" onClick={onLogout}>
                        立即退出 / Sign out now
                    </Button>,
                    <Button key="stay" type="primary" onClick={onStay}>
                        继续使用 / Stay signed in
                    </Button>,
                    ]
                }
                onCancel={onLogout}
            >
                <p>
                    检测到您已闲置较长时间。{secondsLeft} 秒后将自动退出登录,以保护账户安全。
                </p>
                <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
                    You've been idle for a while. You will be signed out in {secondsLeft}{' '}
                    seconds.
                </p>
                <Progress
                    percent={percent}
                    status={secondsLeft <= 10 ? 'exception' : 'active'}
                    showInfo={false}
            />
            </Modal>
        )
    }