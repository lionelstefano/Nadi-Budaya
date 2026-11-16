import unittest

from app.camera import draw_betawi_filter, draw_betawi_pose_filter, evaluate_dance_pose, face_filter_sequence, is_peace_gesture
from app.store import xp_level


class Point:
    def __init__(self, y=0.5, x=0.5, visibility=1.0):
        self.x = x
        self.y = y
        self.visibility = visibility


class FacePoint:
    def __init__(self, x, y):
        self.x = x
        self.y = y


class FaceLandmarks:
    def __init__(self):
        self.landmark = [FacePoint(0.5, 0.5) for _ in range(468)]
        self.landmark[10] = FacePoint(0.5, 0.25)
        self.landmark[127] = FacePoint(0.25, 0.4)
        self.landmark[356] = FacePoint(0.75, 0.4)


class CoreTests(unittest.TestCase):
    def test_xp_level(self):
        self.assertEqual(xp_level(0), 1)
        self.assertEqual(xp_level(99), 1)
        self.assertEqual(xp_level(100), 2)
        self.assertEqual(xp_level(250), 3)

    def test_peace_gesture_true(self):
        points = [Point(0.5) for _ in range(21)]
        points[8] = Point(0.2)   # index tip up vs pip
        points[6] = Point(0.4)
        points[12] = Point(0.1)  # middle tip up vs pip
        points[10] = Point(0.3)
        points[16] = Point(0.5)  # ring down vs pip
        points[14] = Point(0.3)
        points[20] = Point(0.6)  # pinky down vs pip
        points[18] = Point(0.4)
        self.assertTrue(is_peace_gesture(points))

    def test_peace_gesture_false(self):
        points = [Point(0.5) for _ in range(21)]
        self.assertFalse(is_peace_gesture(points))
        self.assertFalse(is_peace_gesture([]))

    def test_pose_guide_requires_visible_shoulders_and_wrists(self):
        points = [Point() for _ in range(33)]
        ok, message = evaluate_dance_pose(points, 0)
        self.assertTrue(ok)
        self.assertIn("Tubuh terdeteksi", message)
        points[15].visibility = 0.1
        ok, message = evaluate_dance_pose(points, 1)
        self.assertFalse(ok)
        self.assertIn("terlihat", message)

    def test_pose_guide_right_and_left_arm(self):
        points = [Point() for _ in range(33)]
        points[12] = Point(y=0.5, x=0.65)
        points[16] = Point(y=0.25, x=0.7)
        points[11] = Point(y=0.5, x=0.35)
        points[15] = Point(y=0.7, x=0.3)
        ok, _ = evaluate_dance_pose(points, 2)
        self.assertTrue(ok)
        points[15] = Point(y=0.2, x=0.3)
        ok, _ = evaluate_dance_pose(points, 3)
        self.assertTrue(ok)

    def test_betawi_filter_draws_on_frame(self):
        import numpy as np
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        landmarks = FaceLandmarks()
        for name in ("iket", "mahkota", "kembang", "topeng", "ondel_merah", "ondel_biru", "abang", "mahkota_kembang", "bando_emas", "topeng_kembang", "pita_merah"):
            test_frame = frame.copy()
            draw_betawi_filter(test_frame, landmarks, name)
            self.assertGreater(int(test_frame.sum()), 0, name)
        unchanged = frame.copy()
        draw_betawi_filter(unchanged, landmarks, "none")
        self.assertEqual(int(unchanged.sum()), 0)

    def test_group_effect_sequence_supports_up_to_four_faces(self):
        self.assertEqual(face_filter_sequence("iket", "same", 3), ["iket", "iket", "iket"])
        varied = face_filter_sequence("iket", "mix", 4)
        self.assertEqual(len(varied), 4)
        self.assertEqual(varied[0], "iket")
        self.assertEqual(len(set(varied)), 4)
        self.assertEqual(face_filter_sequence("none", "mix", 3), ["none", "none", "none"])
        self.assertEqual(len(face_filter_sequence("iket", "mix", 9)), 4)

    def test_camera_code_enables_four_faces_and_draws_each_detected_face(self):
        from pathlib import Path
        source=(Path(__file__).resolve().parents[1]/"app"/"camera.py").read_text(encoding="utf-8")
        self.assertIn("max_num_faces=4", source)
        self.assertIn("for face_landmarks, effect_for_face in zip(faces, face_effects)", source)

    def test_selendang_pose_filter_draws_on_frame(self):
        import numpy as np
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        points = [Point() for _ in range(33)]
        points[11] = Point(y=0.25, x=0.38)
        points[12] = Point(y=0.25, x=0.62)
        points[23] = Point(y=0.68, x=0.43)
        points[24] = Point(y=0.68, x=0.57)
        draw_betawi_pose_filter(frame, type("Pose", (), {"landmark": points})(), "selendang")
        self.assertGreater(int(frame.sum()), 0)


if __name__ == '__main__':
    unittest.main()


class CameraOverlayRegressionTests(unittest.TestCase):
    def test_face_and_pose_landmark_debug_drawing_is_not_enabled(self):
        from pathlib import Path
        source = (Path(__file__).resolve().parents[1] / "app" / "camera.py").read_text(encoding="utf-8")
        self.assertNotIn("drawing_utils.draw_landmarks", source)
        self.assertIn("Do not draw face/body mesh dots", source)
